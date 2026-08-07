import { requestUrl } from 'obsidian';
import { formatUtc } from './format';

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

/** Head-to-head record between two players, from `GET /h2h`. */
export interface H2hMeeting {
	era?: 'archive' | 'current';
	date?: string | null;
	tournament?: string | null;
	level?: string | null;
	round?: string | null;
	surface?: string | null;
	score?: string | null;
	outcome?: string | null;
	/** 1|2 of THIS head-to-head (p1/p2 as requested); null when underivable. */
	winner?: 1 | 2 | null;
}

export interface HeadToHead {
	/** Resolved names; null when no player matches the fragments. */
	players?: { p1?: { name?: string }; p2?: { name?: string } } | null;
	totals?: {
		p1_wins?: number;
		p2_wins?: number;
		meetings?: number;
		undecided?: number;
	};
	/** Per-surface win split; keys are surface names plus 'unknown'. */
	by_surface?: Record<string, { p1?: number; p2?: number }>;
	/** Newest first, capped at 200 by the API. */
	meetings?: H2hMeeting[];
}

interface ListResponse<T> {
	data?: T[];
}

/** Error body shapes the API sends with 4xx responses. */
interface ErrorBody {
	error?: string;
	detail?: string;
	scope?: string;
	resets_at?: string;
	retry_at_epoch?: number;
}

/** Fallback block length when a 429 `abuse_throttled` carries no retry_at_epoch. */
const ABUSE_FALLBACK_MS = 60 * 60 * 1000;

/**
 * Raised when the API has blocked the key for chronic over-limit traffic
 * (429 `abuse_throttled`). The client remembers `retryAt` and refuses to send
 * anything before it, so re-rendering a note never hammers a blocked key.
 * Renderers should NOT offer a Refresh action for this error.
 */
export class AbuseThrottledError extends Error {
	constructor(readonly retryAt: Date) {
		super(
			`The Live Tennis API has temporarily blocked this key after repeated over-limit requests (abuse_throttled). Requests resume after ${formatUtc(retryAt.toISOString())}. If something else uses this key in a retry loop, fix that first.`,
		);
	}
}

/**
 * Thin read-only client for the Live Tennis API. All requests go through
 * Obsidian's `requestUrl` so they work on mobile and desktop alike.
 */
export class LiveTennisClient {
	/** Set on 429 `abuse_throttled`; no request is sent before this instant. */
	private throttledUntil: Date | null = null;

	constructor(private readonly getApiKey: () => string) {}

	private async get<T>(
		path: string,
		params: Record<string, string | number | undefined> = {},
		upgradeMessage?: string,
	): Promise<T> {
		if (this.throttledUntil && Date.now() < this.throttledUntil.getTime()) {
			throw new AbuseThrottledError(this.throttledUntil);
		}
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
			headers: { Authorization: `Bearer ${key}` },
			throw: false,
		});
		let body: ErrorBody = {};
		if (response.status >= 400) {
			try {
				body = response.json as ErrorBody;
			} catch {
				// Non-JSON error body; fall back to status-only messages.
			}
		}
		if (response.status === 401) {
			throw new Error(
				'The Live Tennis API rejected the key (401). Check it in the plugin settings.',
			);
		}
		if (response.status === 403) {
			throw new Error(
				upgradeMessage ??
					'This data needs a higher tier — upgrade at https://livetennisapi.com/subscribe/upgrade',
			);
		}
		if (response.status === 404) {
			throw new Error('The Live Tennis API has no such resource (404).');
		}
		if (response.status === 429) {
			if (body.error === 'abuse_throttled') {
				const retryAt =
					typeof body.retry_at_epoch === 'number'
						? new Date(body.retry_at_epoch * 1000)
						: new Date(Date.now() + ABUSE_FALLBACK_MS);
				this.throttledUntil = retryAt;
				throw new AbuseThrottledError(retryAt);
			}
			if (body.scope === 'day') {
				const resets = formatUtc(body.resets_at);
				throw new Error(
					`Daily request quota reached (429)${resets ? `; it resets at ${resets}` : ''}. Higher quotas: https://livetennisapi.com/subscribe/upgrade`,
				);
			}
			throw new Error(
				'Live Tennis API rate limit reached (429). Try again in a minute.',
			);
		}
		if (response.status === 400 && body.detail) {
			// e.g. ambiguous_name on /h2h, with the candidate list spelled out.
			throw new Error(body.detail);
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
		const response = await this.get<ListResponse<Match>>(
			'/matches',
			{
				status: options.status,
				tour: options.tour,
				limit: options.limit,
			},
			'Completed-match listings need the BASIC tier ($9.99/mo) or any History plan — upgrade at https://livetennisapi.com/subscribe/upgrade',
		);
		return response.data ?? [];
	}

	async getHeadToHead(p1: string, p2: string): Promise<HeadToHead> {
		return this.get<HeadToHead>(
			'/h2h',
			{ p1, p2 },
			'Head-to-head records need the BASIC tier ($9.99/mo) or any History plan — upgrade at https://livetennisapi.com/subscribe/upgrade',
		);
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
