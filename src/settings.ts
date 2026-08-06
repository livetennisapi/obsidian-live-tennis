import {
	App,
	PluginSettingTab,
	Setting,
	SettingDefinitionItem,
} from 'obsidian';
import type LiveTennisPlugin from './main';

export interface LiveTennisSettings {
	apiKey: string;
}

export const DEFAULT_SETTINGS: LiveTennisSettings = {
	apiKey: '',
};

function apiKeyDescription(): DocumentFragment {
	return createFragment((fragment) => {
		fragment.appendText(
			'Key for the Live Tennis API. A free tier (no card required, 100 requests per day) is available: ',
		);
		fragment.createEl('a', {
			text: 'Get a free key',
			href: 'https://livetennisapi.com/subscribe/free',
		});
		fragment.appendText('.');
	});
}

export class LiveTennisSettingTab extends PluginSettingTab {
	plugin: LiveTennisPlugin;

	constructor(app: App, plugin: LiveTennisPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'API key',
				desc: apiKeyDescription(),
				control: {
					type: 'text',
					key: 'apiKey',
					placeholder: 'Your API key',
					defaultValue: '',
				},
			},
		];
	}

	/**
	 * Fallback for Obsidian versions older than 1.13.0, which lack the
	 * declarative settings API. Not called on newer versions because
	 * getSettingDefinitions() returns a non-empty array.
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('API key')
			.setDesc(apiKeyDescription())
			.addText((text) =>
				text
					.setPlaceholder('Your API key')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						await this.plugin.saveSettings();
					}),
			);
	}
}
