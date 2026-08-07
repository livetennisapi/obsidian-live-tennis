import type { H2hMeeting, HeadToHead } from './api';
import { eventLabel } from './format';
import { stripQuotes } from './query';
import { renderRefresh } from './render';

export const DEFAULT_MEETINGS = 5;
export const MAX_MEETINGS = 20;

/** Minimum name-fragment length the API's /h2h endpoint accepts. */
const MIN_NAME_LENGTH = 3;

/** A parsed `h2h` code block. */
export interface H2hQuery {
	p1: string;
	p2: string;
	/** How many recent meetings to list; 0 shows totals only. */
	limit: number;
}

/**
 * Parses the body of a ```h2h block — same YAML-ish grammar as the `tennis`
 * block: one `option: value` per line, `#` comments, unknown options and bad
 * values are errors so a typo never silently changes what the block shows.
 */
export function parseH2hQuery(source: string): H2hQuery {
	let p1: string | undefined;
	let p2: string | undefined;
	let limit = DEFAULT_MEETINGS;
	for (const rawLine of source.split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) {
			continue;
		}
		const colon = line.indexOf(':');
		if (colon === -1) {
			throw new Error(`Cannot read "${line}" — expected "option: value".`);
		}
		const key = line.slice(0, colon).trim().toLowerCase();
		const value = stripQuotes(line.slice(colon + 1).trim());
		switch (key) {
			case 'p1':
			case 'p2': {
				if (value.length < MIN_NAME_LENGTH) {
					throw new Error(
						`Player name "${value}" is too short — the API needs at least ${MIN_NAME_LENGTH} characters.`,
					);
				}
				if (key === 'p1') {
					p1 = value;
				} else {
					p2 = value;
				}
				break;
			}
			case 'limit': {
				const parsed = Number.parseInt(value, 10);
				if (Number.isNaN(parsed)) {
					throw new Error(`Limit "${value}" is not a number.`);
				}
				limit = Math.min(Math.max(parsed, 0), MAX_MEETINGS);
				break;
			}
			default:
				throw new Error(
					`Unknown option "${key}" — use p1, p2 or limit.`,
				);
		}
	}
	if (!p1 || !p2) {
		throw new Error(
			'Both players are required — one "p1: name" line and one "p2: name" line.',
		);
	}
	return { p1, p2, limit };
}

/** "hard 2–1 · clay 1–0", skipping surfaces where neither player has a win. */
function surfaceSplit(
	bySurface: HeadToHead['by_surface'],
): string {
	if (!bySurface) {
		return '';
	}
	return Object.entries(bySurface)
		.filter(([, split]) => (split.p1 ?? 0) + (split.p2 ?? 0) > 0)
		.map(([surface, split]) => `${surface} ${split.p1 ?? 0}–${split.p2 ?? 0}`)
		.join(' · ');
}

function renderMeetingRow(
	root: HTMLElement,
	meeting: H2hMeeting,
	names: { p1: string; p2: string },
): void {
	const row = root.createDiv({ cls: 'live-tennis-match' });
	const top = row.createDiv({ cls: 'live-tennis-top' });
	const label = [meeting.date, eventLabel(meeting.tournament, meeting.round)]
		.filter(Boolean)
		.join(' · ');
	top.createSpan({ cls: 'live-tennis-players', text: label || 'Meeting' });
	if (meeting.score) {
		top.createSpan({ cls: 'live-tennis-score', text: meeting.score });
	}
	const parts: string[] = [];
	if (meeting.surface) {
		parts.push(meeting.surface);
	}
	if (meeting.winner === 1 || meeting.winner === 2) {
		parts.push(`won by ${meeting.winner === 1 ? names.p1 : names.p2}`);
	}
	// Walkovers and retirements are part of the record; say so.
	if (meeting.outcome && meeting.outcome !== 'completed') {
		parts.push(meeting.outcome);
	}
	if (parts.length > 0) {
		row.createDiv({ cls: 'live-tennis-sub', text: parts.join(' · ') });
	}
}

/**
 * Renders a head-to-head record: totals headline, surface split, and the
 * most recent meetings (newest first, as the API sends them).
 */
export function renderH2h(
	el: HTMLElement,
	h2h: HeadToHead,
	query: H2hQuery,
	onRefresh: () => void,
): void {
	el.empty();
	const root = el.createDiv({ cls: 'live-tennis-block' });
	if (!h2h.players) {
		root.createDiv({
			cls: 'live-tennis-empty',
			text: `No players match "${query.p1}" vs "${query.p2}".`,
		});
		renderRefresh(root, onRefresh);
		return;
	}
	const names = {
		p1: h2h.players.p1?.name ?? query.p1,
		p2: h2h.players.p2?.name ?? query.p2,
	};
	const totals = h2h.totals ?? {};
	const top = root.createDiv({ cls: 'live-tennis-top' });
	const players = top.createSpan({ cls: 'live-tennis-players' });
	players.appendText(names.p1);
	players.createSpan({ cls: 'live-tennis-vs', text: ' vs ' });
	players.appendText(names.p2);
	top.createSpan({
		cls: 'live-tennis-score',
		text: `${totals.p1_wins ?? 0}–${totals.p2_wins ?? 0}`,
	});
	const meetings = totals.meetings ?? 0;
	const summary = [`${meetings} ${meetings === 1 ? 'meeting' : 'meetings'}`];
	if (totals.undecided) {
		summary.push(`${totals.undecided} with no recorded winner`);
	}
	root.createDiv({ cls: 'live-tennis-sub', text: summary.join(' · ') });
	const surfaces = surfaceSplit(h2h.by_surface);
	if (surfaces) {
		root.createDiv({ cls: 'live-tennis-sub', text: surfaces });
	}
	for (const meeting of (h2h.meetings ?? []).slice(0, query.limit)) {
		renderMeetingRow(root, meeting, names);
	}
	renderRefresh(root, onRefresh);
}
