import { App, Notice, SuggestModal } from 'obsidian';
import type { LiveTennisClient, Player } from './api';
import { playerProfileLine } from './format';

const SEARCH_DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

/**
 * Searches players by name against the live API and hands the chosen
 * player's markdown profile line to `onChoose`. Input is debounced so
 * typing does not burn through the API's per-minute rate limit.
 */
export class PlayerSearchModal extends SuggestModal<Player> {
	constructor(
		app: App,
		private readonly client: LiveTennisClient,
		private readonly onChoose: (line: string) => void,
	) {
		super(app);
		this.setPlaceholder('Type a player name…');
		this.emptyStateText = 'No players found.';
	}

	async getSuggestions(query: string): Promise<Player[]> {
		const term = query.trim();
		if (term.length < MIN_QUERY_LENGTH) {
			return [];
		}
		await new Promise((resolve) =>
			window.setTimeout(resolve, SEARCH_DEBOUNCE_MS),
		);
		if (this.inputEl.value.trim() !== term) {
			return []; // Superseded by further typing; skip the request.
		}
		try {
			return await this.client.searchPlayers(term, 10);
		} catch (error) {
			new Notice(
				error instanceof Error ? error.message : String(error),
			);
			return [];
		}
	}

	renderSuggestion(player: Player, el: HTMLElement): void {
		el.createDiv({ text: player.name });
		const details = [
			player.country,
			player.ranking !== null && player.ranking !== undefined
				? `rank ${player.ranking}`
				: null,
			player.is_doubles_team ? 'doubles team' : null,
		]
			.filter(Boolean)
			.join(' · ');
		if (details) {
			el.createDiv({
				cls: 'live-tennis-suggestion-detail',
				text: details,
			});
		}
	}

	onChooseSuggestion(player: Player): void {
		void this.insertProfile(player);
	}

	private async insertProfile(player: Player): Promise<void> {
		try {
			// The single-player endpoint carries the fuller biography.
			this.onChoose(
				playerProfileLine(await this.client.getPlayer(player.id)),
			);
		} catch {
			this.onChoose(playerProfileLine(player));
		}
	}
}
