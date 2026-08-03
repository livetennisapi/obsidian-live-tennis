# Live Tennis

An [Obsidian](https://obsidian.md) plugin that embeds live tennis scores in your notes and — more importantly for journaling — freezes them into permanent markdown. Powered by the [Live Tennis API](https://livetennisapi.com).

Two ways to use it:

- A **`tennis` code block** that renders current matches every time the note is previewed (always fresh, never stored).
- A **snapshot command** that resolves the same query once and inserts a static markdown table — the score as it stood at that moment, preserved in your note forever. A companion command inserts a one-line player profile.

## Setup

1. Get an API key. The free tier needs no card and allows 1000 requests per day (30 per minute): <https://livetennisapi.com/subscribe/free>.
2. Open **Settings → Live Tennis** and paste the key.

## The `tennis` code block

````markdown
```tennis
status: live
tour: atp
limit: 5
```
````

One `option: value` per line; `#` starts a comment. All options are optional — an empty block shows live matches across all tours.

| Option | Values | Default | Notes |
| --- | --- | --- | --- |
| `status` | `live`, `upcoming`, `completed` | `live` | Match lifecycle to list. `live` and `upcoming` work on the free tier; `completed` needs the BASIC tier ($9.99/mo) or any History plan. |
| `tour` | `atp`, `wta`, `challenger`, `itf`, `juniors` | all | Each value covers its singles and doubles draws. |
| `limit` | 1–20 | 5 | Maximum matches shown. |
| `match` | a match id | — | Show one specific match; overrides the other options. |
| `player` | a name, e.g. `"Alcaraz"` | — | Only matches involving this player (name filter applied client-side). |

Each render fetches once; use the **Refresh** button under the block to re-fetch without leaving the note. The block does not poll in the background, so it stays friendly to the free tier's rate limits.

## Commands

- **Insert match snapshot** — resolves a query once and inserts a static markdown table (players, event, per-set score, surface, winner) with a timestamp caption. If the cursor is inside a `tennis` code block, that block's query is frozen and the table is inserted right after the block; otherwise the default query (live matches) is inserted at the cursor.
- **Insert player profile** — search players by name and insert a one-line profile (country, tour, ranking, handedness, backhand, birthday) at the cursor.

Neither command has a default hotkey; assign your own under **Settings → Hotkeys** if you use them often.

Example snapshot output:

```markdown
| Players | Event | Score | Surface | Winner |
| --- | --- | --- | --- | --- |
| Alcaraz C. vs Sinner J. | ATP Finals · Final | 6–4, 3–2 (40–15) | hard | — |

*Snapshot from the Live Tennis API, 2026-07-24 12:00 UTC.*
```

## Network use and account disclosures

- **Remote service.** This plugin talks to the Live Tennis API at `https://api.livetennisapi.com` — and to no other host. That is where the scores come from; the plugin has no offline data source.
- **When requests happen.** Rendering a `tennis` code block, pressing its Refresh button, and running either insert command each make one or more HTTPS requests. Nothing polls in the background and nothing runs at startup.
- **What is sent.** Only your API key (as a request header) and the query parameters (status, tour, limit, match id, or a player name you typed). No vault content, note text, or telemetry is ever transmitted.
- **Account required.** The API requires an account. The free tier is self-serve with no payment card, at 1000 requests per day: <https://livetennisapi.com/subscribe/free>. Live and upcoming matches, single-match lookups (including completed ones), and player profiles all work on the free tier. Listing completed matches (`status: completed`) needs the BASIC tier ($9.99/mo) or any History plan — on a free key the block shows an upgrade note instead. Higher tiers (PRO/ULTRA) unlock endpoints this plugin does not use (market prices, model analysis).
- **Storage.** The API key is stored in plain text in the plugin's `data.json` inside your vault, like most Obsidian plugin settings. Do not commit it to a public vault repository.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type-check + production build
npm run lint    # eslint with eslint-plugin-obsidianmd
```

Source lives in `src/`; `main.js` is generated and not committed.

### Releasing

1. Update the version: `npm version patch|minor|major` (this runs `version-bump.mjs`, which syncs `manifest.json` and `versions.json`).
2. Push the tag. The tag must equal the `manifest.json` version exactly — **no `v` prefix** (`.npmrc` sets `tag-version-prefix=""`).
3. The release workflow builds the plugin and creates a **draft** GitHub release (`gh release create --draft`) with `main.js`, `manifest.json` and `styles.css` attached. **The draft must be published manually** on GitHub — Obsidian's community review only sees published releases.

## Affiliate program

Know developers who need tennis data? The [affiliate program](https://affiliates.livetennisapi.com/program) pays 51% recurring commission for the life of every referred subscription — 30-day cookie, and the people you refer get 10% off.

## License

[MIT](LICENSE)
