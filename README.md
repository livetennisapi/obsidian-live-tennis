# Live Tennis

[![CI](https://github.com/livetennisapi/obsidian-live-tennis/actions/workflows/ci.yml/badge.svg)](https://github.com/livetennisapi/obsidian-live-tennis/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/livetennisapi/obsidian-live-tennis)](https://github.com/livetennisapi/obsidian-live-tennis/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An [Obsidian](https://obsidian.md) plugin that embeds live tennis scores — ATP, WTA, Challenger, ITF and juniors — in your notes and, more importantly for journaling, freezes them into permanent markdown. Powered by the [Live Tennis API](https://livetennisapi.com).

Three ways to use it:

- A **`tennis` code block** that renders current matches every time the note is previewed (always fresh, never stored).
- An **`h2h` code block** that renders the head-to-head record between two players — totals, surface split, recent meetings — across the 1968–2022 results archive and completed matches from 2023 to now.
- A **snapshot command** that resolves a `tennis` query once and inserts a static markdown table — the score as it stood at that moment, preserved in your note forever. A companion command inserts a one-line player profile.

## Install

While the community-plugin listing is under review: download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/livetennisapi/obsidian-live-tennis/releases/latest) into `<vault>/.obsidian/plugins/live-tennis/`, then enable **Live Tennis** under **Settings → Community plugins**.

## Setup

1. Get an API key (they look like `twjp_...`). The free tier needs no card and allows 100 requests per day (30 per minute): <https://livetennisapi.com/subscribe/free>.
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

## The `h2h` code block

````markdown
```h2h
p1: Alcaraz
p2: Sinner
```
````

Renders the record between two players, assembled from both halves of the product: the results archive (1968–2022) and completed matches (2023→now). Totals count meetings with a known winner; walkovers and retirements stay in the record and are labelled. Needs the BASIC tier ($9.99/mo) or any History plan — on a free key the block shows an upgrade note instead.

| Option | Values | Default | Notes |
| --- | --- | --- | --- |
| `p1`, `p2` | name fragments, min 3 characters | required | A fragment matching more than one player is refused with the candidate list, so two people are never summed into one record. |
| `limit` | 0–20 | 5 | Most recent meetings listed under the totals; `0` shows totals only. |

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

## What the plugin calls, and what each call needs

| Feature | Endpoint | Tier |
| --- | --- | --- |
| `tennis` block, match snapshot | `GET /matches`, `GET /matches/{id}` | FREE (`status: completed` listings need BASIC or any History plan) |
| `h2h` block | `GET /h2h` | BASIC, or any History plan |
| Player profile | `GET /players`, `GET /players/{id}` | FREE |

Higher tiers (PRO/ULTRA) unlock endpoints this plugin does not use (market prices, model analysis, rally tapes).

## Quotas

| Tier | Per minute | Per day | Price |
| --- | --- | --- | --- |
| FREE | 30 | 100 | $0 |
| BASIC | 60 | 1,000 | $9.99/mo |
| PRO | 300 | 10,000 | $29.99/mo |
| ULTRA | 600 | 500,000 | $99.99/mo |

Every response carries `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` headers, and 429s carry `Retry-After`. Blocks render on demand and never poll, so a free key goes a long way in normal note-taking; a vault that acts as an always-on dashboard is better served by BASIC. When the daily quota runs out, the block shows the actual reset time from the API's `resets_at`. If the API blocks a key for chronic over-limit traffic (`abuse_throttled`), the plugin says when requests resume and sends nothing until then — re-rendering the note does not retry.

## Authentication

The plugin sends your key as `Authorization: Bearer twjp_...`, the API's preferred scheme (it also accepts `X-API-Key`). See the [API docs](https://docs.livetennisapi.com) for everything the API itself offers.

## Network use and account disclosures

- **Remote service.** This plugin talks to the Live Tennis API at `https://api.livetennisapi.com` — and to no other host. That is where the scores come from; the plugin has no offline data source.
- **When requests happen.** Rendering a `tennis` or `h2h` code block, pressing a Refresh button, and running either insert command each make one or more HTTPS requests. Nothing polls in the background and nothing runs at startup.
- **What is sent.** Only your API key (as a request header) and the query parameters (status, tour, limit, match id, or the player names you typed). No vault content, note text, or telemetry is ever transmitted.
- **Account required.** The API requires an account. The free tier is self-serve with no payment card, at 100 requests per day: <https://livetennisapi.com/subscribe/free>. Live and upcoming matches, single-match lookups (including completed ones), and player profiles all work on the free tier. Listing completed matches (`status: completed`) and head-to-head records need the BASIC tier ($9.99/mo) or any History plan — on a free key the block shows an upgrade note instead.
- **Storage.** The API key is stored in plain text in the plugin's `data.json` inside your vault, like most Obsidian plugin settings. Do not commit it to a public vault repository.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type-check + production build
npm run lint    # eslint with eslint-plugin-obsidianmd
```

Source lives in `src/`; `main.js` is generated and not committed. CI builds, lints, and runs `scripts/truthcheck.sh`, which pins the product facts in this README to the current API.

### Releasing

1. Update the version: `npm version patch|minor|major` (this runs `version-bump.mjs`, which syncs `manifest.json` and `versions.json`).
2. Push the tag. The tag must equal the `manifest.json` version exactly — **no `v` prefix** (`.npmrc` sets `tag-version-prefix=""`).
3. The release workflow builds the plugin and creates a **draft** GitHub release (`gh release create --draft`) with `main.js`, `manifest.json` and `styles.css` attached. **The draft must be published manually** on GitHub — Obsidian's community review only sees published releases.

## Affiliate program

Know developers who need tennis data? The [affiliate program](https://affiliates.livetennisapi.com/program) pays 51% recurring commission for the life of every referred subscription — 30-day cookie, and the people you refer get 10% off.

## Links

- API docs: <https://docs.livetennisapi.com>
- Free API key: <https://livetennisapi.com/subscribe/free>
- Discord: <https://discord.gg/f8WUZHgDm6>
- GitHub org: <https://github.com/livetennisapi>

## License

[MIT](LICENSE)
