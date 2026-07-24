import { requestUrl } from 'obsidian';

export const API_BASE = 'https://api.livetennisapi.com/api/public/v1';

/**
 * Current score of a match. Field shapes follow the Live Tennis API:
 * `points` entries are strings ("0", "15", "40", "A"), `games` holds one
 * per-set list per player, and `server` is null between points/matches.
 */
export interface Score {
	sets?: number[];
	games?: number[][];
	points?: string[];
	server?: 1 | 2 | null;
	is_tiebreak?: boolean;
	timestamp?: string | null;
}

export interface Player {
	id: number;
	name: string;
	tour?: string | null;
	country?: string | null;
	ranking?: number | null;
	ranking_points?: number | null;
	hand?: 'R' | 'L' | null;
	backhand?: 1 | 2 | null;
	birthday?: string | null;
	is_doubles_team?: boolean;
}

export interface Match {
	id: number;
	tournament?: string | null;
	surface?: 'hard' | 'clay' | 'grass' | null;
	indoor?: boolean;
	format?: 'BO3' | 'BO5' | null;
	round?: string | null;
	status?: 'upcoming' | 'live' | 'completed' | 'cancelled';
	is_doubles?: boolean;
	scheduled_time?: string | null;
	players?: { p1?: Player; p2?: Player };
	score?: Score | null;
	winner?: 1 | 2 | null;
}

interface ListResponse<T> {
	data?: T[];
}

/**
 * Thin read-only client for the Live Tennis API. All requests go through
 * Obsidian's `requestUrl` so they work on mobile and desktop alike.
 */
export class LiveTennisClient {
	constructor(private readonly getApiKey: () => string) {}

	private async get<T>(
		path: string,
		params: Record<string, string | number | undefined> = {},
	): Promise<T> {
		const key = this.getApiKey().trim();
		if (!key) {
			throw new Error(
				'No API key configured. Add one in the plugin settings (free keys at livetennisapi.com/subscribe/free).',
			);
		}
		const search = Object.entries(params)
			.filter(([, value]) => value !== undefined && value !== '')
			.map(
				([name, value]) =>
					`${name}=${encodeURIComponent(String(value))}`,
			)
			.join('&');
		const url = `${API_BASE}${path}${search ? `?${search}` : ''}`;
		const response = await requestUrl({
			url,
			headers: { 'X-API-Key': key },
			throw: false,
		});
		if (response.status === 401) {
			throw new Error(
				'The Live Tennis API rejected the key (401). Check it in the plugin settings.',
			);
		}
		if (response.status === 403) {
			throw new Error(
				'This request needs a higher Live Tennis API tier (403).',
			);
		}
		if (response.status === 404) {
			throw new Error('The Live Tennis API has no such resource (404).');
		}
		if (response.status === 429) {
			throw new Error(
				'Live Tennis API rate limit reached (429). Try again in a minute.',
			);
		}
		if (response.status >= 400) {
			throw new Error(`Live Tennis API error (${response.status}).`);
		}
		return response.json as T;
	}

	async listMatches(options: {
		status?: string;
		tour?: string;
		limit?: number;
	}): Promise<Match[]> {
		const response = await this.get<ListResponse<Match>>('/matches', {
			status: options.status,
			tour: options.tour,
			limit: options.limit,
		});
		return response.data ?? [];
	}

	async getMatch(matchId: number): Promise<Match> {
		return this.get<Match>(`/matches/${matchId}`);
	}

	async searchPlayers(search: string, limit = 10): Promise<Player[]> {
		const response = await this.get<ListResponse<Player>>('/players', {
			search,
			limit,
		});
		return response.data ?? [];
	}

	async getPlayer(playerId: number): Promise<Player> {
		return this.get<Player>(`/players/${playerId}`);
	}
}
