import { Editor, Notice, Plugin } from 'obsidian';
import { LiveTennisClient } from './api';
import { snapshotTable } from './format';
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
			renderError(el, errorMessage(error), refresh);
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
