import type { Match } from './api';
import {
	eventLabel,
	formatUtc,
	playerNames,
	scoreSummary,
	winnerName,
} from './format';
import type { TennisQuery } from './query';

function statusLine(match: Match): string {
	const parts = [eventLabel(match.tournament, match.round)];
	if (match.surface) {
		parts.push(match.indoor ? `${match.surface} (indoor)` : match.surface);
	}
	if (match.status === 'upcoming') {
		const scheduled = formatUtc(match.scheduled_time);
		if (scheduled) {
			parts.push(scheduled);
		}
	} else if (match.status === 'completed') {
		const winner = winnerName(match);
		parts.push(winner ? `won by ${winner}` : 'completed');
	} else if (match.status === 'cancelled') {
		parts.push('cancelled');
	}
	return parts.filter(Boolean).join(' · ');
}

function renderMatchRow(root: HTMLElement, match: Match): void {
	const row = root.createDiv({ cls: 'live-tennis-match' });
	const top = row.createDiv({ cls: 'live-tennis-top' });
	const players = top.createSpan({ cls: 'live-tennis-players' });
	const names = playerNames(match);
	const server = match.score?.server;
	if (server === 1) {
		players.createSpan({
			cls: 'live-tennis-serving',
			text: '●',
			attr: { 'aria-label': 'Serving' },
		});
	}
	players.appendText(names.p1);
	players.createSpan({ cls: 'live-tennis-vs', text: ' vs ' });
	players.appendText(names.p2);
	if (server === 2) {
		players.createSpan({
			cls: 'live-tennis-serving',
			text: '●',
			attr: { 'aria-label': 'Serving' },
		});
	}
	const score = scoreSummary(match);
	if (score && match.status !== 'upcoming') {
		top.createSpan({ cls: 'live-tennis-score', text: score });
	}
	row.createDiv({ cls: 'live-tennis-sub', text: statusLine(match) });
}

function renderRefresh(root: HTMLElement, onRefresh: () => void): void {
	const button = root.createEl('button', {
		cls: 'live-tennis-refresh',
		text: 'Refresh',
	});
	button.addEventListener('click', onRefresh);
}

export function renderLoading(el: HTMLElement): void {
	el.empty();
	el.createDiv({ cls: 'live-tennis-block' }).createDiv({
		cls: 'live-tennis-empty',
		text: 'Loading matches…',
	});
}

export function renderError(
	el: HTMLElement,
	message: string,
	onRefresh?: () => void,
): void {
	el.empty();
	const root = el.createDiv({ cls: 'live-tennis-block' });
	root.createDiv({ cls: 'live-tennis-error', text: message });
	if (onRefresh) {
		renderRefresh(root, onRefresh);
	}
}

export function renderMatches(
	el: HTMLElement,
	matches: Match[],
	query: TennisQuery,
	onRefresh: () => void,
): void {
	el.empty();
	const root = el.createDiv({ cls: 'live-tennis-block' });
	if (matches.length === 0) {
		root.createDiv({
			cls: 'live-tennis-empty',
			text: `No ${query.status} matches found.`,
		});
	} else {
		for (const match of matches) {
			renderMatchRow(root, match);
		}
	}
	renderRefresh(root, onRefresh);
}
