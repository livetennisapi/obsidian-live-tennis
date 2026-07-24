import type { LiveTennisClient, Match } from './api';

export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 20;

/** How many matches to fetch before a client-side player filter is applied. */
const PLAYER_FILTER_FETCH_LIMIT = 100;

export type MatchStatus = 'live' | 'upcoming' | 'completed';

/** A parsed `tennis` code block. */
export interface TennisQuery {
	status: MatchStatus;
	tour?: string;
	limit: number;
	match?: number;
	player?: string;
}

export function defaultQuery(): TennisQuery {
	return { status: 'live', limit: DEFAULT_LIMIT };
}

function stripQuotes(value: string): string {
	if (
		value.length >= 2 &&
		((value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'")))
	) {
		return value.slice(1, -1);
	}
	return value;
}

/**
 * Parses the YAML-ish body of a ```tennis block: one `option: value` per
 * line, `#` comments allowed. Unknown options and bad values are errors so a
 * typo never silently changes what the block shows.
 */
export function parseQuery(source: string): TennisQuery {
	const query = defaultQuery();
	for (const rawLine of source.split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) {
			continue;
		}
		const colon = line.indexOf(':');
		if (colon === -1) {
			throw new Error(
				`Cannot read "${line}" — expected "option: value".`,
			);
		}
		const key = line.slice(0, colon).trim().toLowerCase();
		const value = stripQuotes(line.slice(colon + 1).trim());
		switch (key) {
			case 'status': {
				const status = value.toLowerCase();
				if (
					status !== 'live' &&
					status !== 'upcoming' &&
					status !== 'completed'
				) {
					throw new Error(
						`Unknown status "${value}" — use live, upcoming or completed.`,
					);
				}
				query.status = status;
				break;
			}
			case 'tour':
				query.tour = value.toLowerCase();
				break;
			case 'limit': {
				const limit = Number.parseInt(value, 10);
				if (Number.isNaN(limit)) {
					throw new Error(`Limit "${value}" is not a number.`);
				}
				query.limit = Math.min(Math.max(limit, 1), MAX_LIMIT);
				break;
			}
			case 'match': {
				const matchId = Number.parseInt(value, 10);
				if (Number.isNaN(matchId)) {
					throw new Error(
						`Match id "${value}" is not a number.`,
					);
				}
				query.match = matchId;
				break;
			}
			case 'player':
				query.player = value;
				break;
			default:
				throw new Error(
					`Unknown option "${key}" — use status, tour, limit, match or player.`,
				);
		}
	}
	return query;
}

const FENCE_OPEN = /^(?:`{3,}|~{3,})\s*tennis\s*$/;
const FENCE_ANY = /^(?:`{3,}|~{3,})/;
const FENCE_CLOSE = /^(?:`{3,}|~{3,})\s*$/;

export interface BlockQueryMatch {
	query: TennisQuery;
	/** Line index of the closing fence (or last line if unclosed). */
	endLine: number;
}

/**
 * If `cursorLine` sits inside a ```tennis fenced block, returns that block's
 * parsed query and the closing fence line; otherwise null. Used by the
 * snapshot command so freezing reuses the query the note already declares.
 */
export function blockQueryAt(
	lines: string[],
	cursorLine: number,
): BlockQueryMatch | null {
	let start = -1;
	for (let i = cursorLine; i >= 0; i--) {
		const line = lines[i]?.trim() ?? '';
		if (FENCE_OPEN.test(line)) {
			start = i;
			break;
		}
		if (FENCE_ANY.test(line)) {
			return null; // Inside some other fence, or above a closed block.
		}
	}
	if (start === -1) {
		return null;
	}
	let end = lines.length - 1;
	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i]?.trim() ?? '';
		if (FENCE_CLOSE.test(line)) {
			end = i;
			break;
		}
	}
	if (cursorLine > end) {
		return null;
	}
	const body = lines.slice(start + 1, end).join('\n');
	return { query: parseQuery(body), endLine: end };
}

/**
 * Resolves a query to matches, exactly once. `match:` wins over everything;
 * `player:` is a client-side name filter because the API's /matches endpoint
 * has no player parameter.
 */
export async function resolveQuery(
	client: LiveTennisClient,
	query: TennisQuery,
): Promise<Match[]> {
	if (query.match !== undefined) {
		return [await client.getMatch(query.match)];
	}
	const matches = await client.listMatches({
		status: query.status,
		tour: query.tour,
		limit: query.player ? PLAYER_FILTER_FETCH_LIMIT : query.limit,
	});
	if (!query.player) {
		return matches;
	}
	const needle = query.player.toLowerCase();
	return matches
		.filter((match) =>
			[match.players?.p1?.name, match.players?.p2?.name].some((name) =>
				name?.toLowerCase().includes(needle),
			),
		)
		.slice(0, query.limit);
}
