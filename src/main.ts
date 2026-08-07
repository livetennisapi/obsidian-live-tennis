import { Editor, Notice, Plugin } from 'obsidian';
import { AbuseThrottledError, LiveTennisClient } from './api';
import { snapshotTable } from './format';
import { H2hQuery, parseH2hQuery, renderH2h } from './h2h';
import { PlayerSearchModal } from './player-modal';
import {
	blockQueryAt,
	defaultQuery,
	parseQuery,
	resolveQuery,
	TennisQuery,
} from './query';
import { renderError, renderLoading, renderMatches } from './render';
import {
	DEFAULT_SETTINGS,
	LiveTennisSettings,
	LiveTennisSettingTab,
} from './settings';

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Refresh callback for an error render — except when the API has blocked the
 * key (abuse_throttled): then there is no Refresh button, because the client
 * refuses to send anything before the block lifts anyway.
 */
function refreshUnless(
	error: unknown,
	refresh: () => void,
): (() => void) | undefined {
	return error instanceof AbuseThrottledError ? undefined : refresh;
}

export default class LiveTennisPlugin extends Plugin {
	settings!: LiveTennisSettings;
	client!: LiveTennisClient;

	async onload() {
		await this.loadSettings();
		this.client = new LiveTennisClient(() => this.settings.apiKey);

		this.addSettingTab(new LiveTennisSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor('tennis', (source, el) =>
			this.renderBlock(source, el),
		);

		this.registerMarkdownCodeBlockProcessor('h2h', (source, el) =>
			this.renderH2hBlock(source, el),
		);

		this.addCommand({
			id: 'insert-match-snapshot',
			name: 'Insert match snapshot',
			editorCallback: (editor: Editor) => {
				void this.insertSnapshot(editor);
			},
		});

		this.addCommand({
			id: 'insert-player-profile',
			name: 'Insert player profile',
			editorCallback: (editor: Editor) => {
				new PlayerSearchModal(this.app, this.client, (line) => {
					editor.replaceSelection(`${line}\n`);
				}).open();
			},
		});
	}

	/** Renders a ```tennis block: parse, fetch once, draw; refreshable. */
	private async renderBlock(source: string, el: HTMLElement): Promise<void> {
		let query: TennisQuery;
		try {
			query = parseQuery(source);
		} catch (error) {
			renderError(el, errorMessage(error));
			return;
		}
		renderLoading(el);
		const refresh = () => {
			void this.renderBlock(source, el);
		};
		try {
			const matches = await resolveQuery(this.client, query);
			renderMatches(el, matches, query, refresh);
		} catch (error) {
			renderError(el, errorMessage(error), refreshUnless(error, refresh));
		}
	}

	/** Renders a ```h2h block: parse, fetch the record once, draw; refreshable. */
	private async renderH2hBlock(
		source: string,
		el: HTMLElement,
	): Promise<void> {
		let query: H2hQuery;
		try {
			query = parseH2hQuery(source);
		} catch (error) {
			renderError(el, errorMessage(error));
			return;
		}
		renderLoading(el, 'Loading head-to-head…');
		const refresh = () => {
			void this.renderH2hBlock(source, el);
		};
		try {
			const h2h = await this.client.getHeadToHead(query.p1, query.p2);
			renderH2h(el, h2h, query, refresh);
		} catch (error) {
			renderError(el, errorMessage(error), refreshUnless(error, refresh));
		}
	}

	/**
	 * Freezes a query into a static markdown table. If the cursor sits
	 * inside a ```tennis block, that block's query is used and the table
	 * lands after its closing fence; otherwise the default query (live
	 * matches) is resolved and the table is inserted at the cursor.
	 */
	private async insertSnapshot(editor: Editor): Promise<void> {
		try {
			const lines = editor.getValue().split('\n');
			const block = blockQueryAt(lines, editor.getCursor().line);
			const query = block ? block.query : defaultQuery();
			const matches = await resolveQuery(this.client, query);
			const table = snapshotTable(matches, new Date());
			if (block) {
				const endOfFence = {
					line: block.endLine,
					ch: editor.getLine(block.endLine).length,
				};
				editor.replaceRange(`\n\n${table}\n`, endOfFence);
			} else {
				editor.replaceSelection(`${table}\n`);
			}
		} catch (error) {
			new Notice(errorMessage(error));
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<LiveTennisSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
