# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-07

### Added

- `h2h` code block: the head-to-head record between two players — totals,
  surface split, and recent meetings — from `GET /h2h`, covering the results
  archive (1968–2022) plus completed matches (2023→now). Needs BASIC or any
  History plan; on a free key the block renders a clear upgrade note.
- CHANGELOG (this file).
- CI workflow: build, lint, and `scripts/truthcheck.sh` truth-pin checks that
  fail the build if stale product facts (old quotas, wrong URLs) reappear.

### Changed

- Quota copy matches the 2026-08-06 grid: free tier is 100 requests per day
  (30 per minute); the README now carries the full four-tier quota table.
- Requests authenticate with `Authorization: Bearer`, the API's preferred
  scheme (previously `X-API-Key`).
- 429 handling now distinguishes the per-minute limit, the daily quota (the
  block shows the actual reset instant from the API's `resets_at`), and
  `abuse_throttled` blocks: the plugin remembers when the block lifts and
  sends nothing before then, so re-rendering a note never hammers a blocked
  key — and no Refresh button is offered while blocked.
- API 400 details (for example an ambiguous name fragment on `/h2h`, refused
  with the candidate list) are shown in the block as sent.
- README restructured: install, endpoint/tier table, quota table, auth
  section, and canonical links.

### Fixed

- LICENSE copyright holder is Live Tennis API.

## [1.0.1] - 2026-08-02

### Changed

- Uppercase country codes in player profile lines.
- Truthful tier note for completed-match listings and a canonical 403
  message; org author metadata.
- README: usage, code-block options, network/account disclosures, and the
  release process.

## [1.0.0] - 2026-07-24

### Added

- Initial release: `tennis` code block scoreboard, match snapshot command,
  and player profile command.

[1.1.0]: https://github.com/livetennisapi/obsidian-live-tennis/releases/tag/1.1.0
[1.0.1]: https://github.com/livetennisapi/obsidian-live-tennis/releases/tag/1.0.1
[1.0.0]: https://github.com/livetennisapi/obsidian-live-tennis/releases/tag/1.0.0
