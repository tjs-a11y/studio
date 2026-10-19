# metrics/

Anonymous usage counts, committed daily by `.github/workflows/metrics.yml`
(which runs `scripts/stats-snapshot.mjs` against the public `GET /api/stats`).

- **`stats.json`** — the latest snapshot: `total_checks` and, per tool, `checks` and `checks_today`.
- **`history.jsonl`** — one compact line per day (`date`, `enabled`, `total_checks`, per-tool `checks`) for trends.

These hold **integer counters only** — how many times a tool was run. They never
contain a visitor, name or email. `/api/event` keeps waitlist emails in a
separate store that `/api/stats` does not read, so nothing personal can reach here.

`enabled: false` means usage counting is off (Upstash/KV not connected); `enabled: null`
with an `error` means the snapshot couldn't be fetched that day.
