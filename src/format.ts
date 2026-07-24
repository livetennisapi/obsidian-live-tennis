import type { Match, Player, Score } from './api';

/**
 * Builds the "event" label from tournament and round. The API's `round`
 * usually restates the tournament ("W50 Horb - 1/16-finals"), so only its
 * final " - " segment is kept, and dropped entirely when the tournament name
 * already contains it. Ported from a proven Homer dashboard implementation.
 */
export function eventLabel(
	tournament: string | null | undefined,
	round: string | null | undefined,
): string {
	const phase = (round ?? '').split(' - ').at(-1)?.trim() ?? '';
	if (!phase || tournament?.includes(phase)) {
		return tournament ?? phase;
	}
	return tournament ? `${tournament} · ${phase}` : phase;
}

/**
 * Per-set game scores, e.g. "6–4, 3–2". `games` holds one per-set list per
 * player; the lists grow in step during a live match.
 */
export function setScores(score: Score | null | undefined): string {
	const games = score?.games;
	const p1 = games?.[0];
	const p2 = games?.[1];
	if (!p1 || !p2 || (p1.length === 0 && p2.length === 0)) {
		return '';
	}
	const sets: string[] = [];
	for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
		sets.push(`${p1[i] ?? 0}–${p2[i] ?? 0}`);
	}
	return sets.join(', ');
}

/** Current points, e.g. "40–A" or "TB 5–3". Points are strings in the API. */
export function currentPoints(score: Score | null | undefined): string {
	const points = score?.points;
	if (
		!Array.isArray(points) ||
		points.length !== 2 ||
		points.some((point) => point === null || point === undefined)
	) {
		return '';
	}
	const pair = `${points[0]}–${points[1]}`;
	return score?.is_tiebreak ? `TB ${pair}` : pair;
}

export function playerNames(match: Match): { p1: string; p2: string } {
	return {
		p1: match.players?.p1?.name ?? '?',
		p2: match.players?.p2?.name ?? '?',
	};
}

export function winnerName(match: Match): string {
	if (match.winner === 1 || match.winner === 2) {
		const names = playerNames(match);
		return match.winner === 1 ? names.p1 : names.p2;
	}
	return '';
}

/** "2026-07-24 13:00 UTC" from an ISO timestamp, or "" when unknown. */
export function formatUtc(iso: string | null | undefined): string {
	if (!iso || iso.length < 16) {
		return '';
	}
	return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** One-line score summary for a match row or table cell. */
export function scoreSummary(match: Match): string {
	if (match.status === 'upcoming') {
		return formatUtc(match.scheduled_time);
	}
	const sets = setScores(match.score);
	if (!sets) {
		return '';
	}
	const points = match.status === 'live' ? currentPoints(match.score) : '';
	return points ? `${sets} (${points})` : sets;
}

function tableCell(value: string): string {
	return value ? value.replace(/\|/g, '\\|') : '—';
}

/**
 * Renders matches as a static markdown table — the frozen snapshot. Columns:
 * players, event (tournament·round deduped), per-set score, surface, winner;
 * a caption line records when the snapshot was taken.
 */
export function snapshotTable(matches: Match[], takenAt: Date): string {
	const caption = `*Snapshot from the Live Tennis API, ${formatUtc(takenAt.toISOString())}.*`;
	if (matches.length === 0) {
		return `*No matches found for this query — snapshot taken ${formatUtc(takenAt.toISOString())}.*`;
	}
	const lines = [
		'| Players | Event | Score | Surface | Winner |',
		'| --- | --- | --- | --- | --- |',
	];
	for (const match of matches) {
		const names = playerNames(match);
		const players = `${names.p1} vs ${names.p2}`;
		lines.push(
			`| ${tableCell(players)} | ${tableCell(eventLabel(match.tournament, match.round))} | ${tableCell(scoreSummary(match))} | ${tableCell(match.surface ?? '')} | ${tableCell(winnerName(match))} |`,
		);
	}
	return `${lines.join('\n')}\n\n${caption}`;
}

/**
 * One markdown line describing a player, built only from the fields the API
 * actually knows (lower tours carry far less biography than the main tour).
 */
export function playerProfileLine(player: Player): string {
	const details: string[] = [];
	if (player.tour) {
		details.push(`${player.tour} tour`);
	}
	if (player.ranking !== null && player.ranking !== undefined) {
		const points =
			player.ranking_points !== null &&
			player.ranking_points !== undefined
				? ` (${player.ranking_points} pts)`
				: '';
		details.push(`rank ${player.ranking}${points}`);
	}
	if (player.hand === 'R') {
		details.push('right-handed');
	} else if (player.hand === 'L') {
		details.push('left-handed');
	}
	if (player.backhand === 1) {
		details.push('one-handed backhand');
	} else if (player.backhand === 2) {
		details.push('two-handed backhand');
	}
	if (player.birthday) {
		details.push(`born ${player.birthday}`);
	}
	if (player.is_doubles_team) {
		details.push('doubles team');
	}
	const country = player.country ? ` (${player.country})` : '';
	const suffix = details.length > 0 ? ` — ${details.join(', ')}` : '';
	return `**${player.name}**${country}${suffix}`;
}
