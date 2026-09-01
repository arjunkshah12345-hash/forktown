# Forktown

**Where agents rehearse before they ship.**

Living simulations of **real** codebases. Connect a GitHub repo → Fingerprint billing/auth/migration surfaces → Found a town → Agents rehearse dangerous migrations against subjective buyers and operators.

This is a product surface with durable storage, agent API keys, and a CLI — not a canned Acme demo.

## Quick start

```bash
pnpm install
pnpm rebuild better-sqlite3   # once
pnpm dev
```

1. Open [http://localhost:3000/connect](http://localhost:3000/connect)
2. Paste a **public** GitHub URL, or scan a **local path** on this machine
3. Open the founded town → repo-aware one-click rehearsal or custom wizard
4. Dashboard at [/dashboard](http://localhost:3000/dashboard) · keys at [/settings/keys](http://localhost:3000/settings/keys)

## Agent API (`/api/v1`)

```bash
export FORKTOWN_API_KEY=ft_live_…
export FORKTOWN_URL=http://localhost:3000

# Ingest GitHub repo → town
pnpm forktown connect https://github.com/org/repo

# Ingest local checkout (Forktown server must read the path)
pnpm forktown connect-local /path/to/repo

# Re-fingerprint after code changes
pnpm forktown resync <townId>

# List towns
pnpm forktown towns

# Rehearse (playbooks auto-detected from fingerprint in UI)
pnpm forktown rehearse <townId> --kind billing --intensity 3

# Fetch report JSON or markdown
pnpm forktown run <runId>
pnpm forktown report <runId> --markdown

# Health
pnpm forktown health
```

### HTTP

```
GET/POST  /api/v1/towns
POST      /api/v1/towns/from-local
POST      /api/v1/towns/:id/rehearse
GET       /api/v1/runs/:id
POST      /api/towns/:id/resync
GET       /api/runs/:id/export   (markdown)
GET       /api/health
```

Auth: `Authorization: Bearer ft_live_…`

## Persistence

SQLite at `.data/forktown.sqlite` (WAL). Towns, plans, runs, and API key hashes (SHA-256) live here. Bootstrap key (if minted) is also written to `.data/bootstrap-api-key.txt`.

## Engine

- **GitHub + local ingest** — real tree / filesystem fingerprint
- **Migration playbooks** — title, hypothesis, intensity from repo signals
- **Subjective minds** — prospect theory, affect, memory, negotiation
- **Phased rehearsal** — prepare → canary → cutover → stress → recovery
- **Adaptive counters** — kill-switch, contagion, district cascades
- **War room + export** — trust sparkline, cast, hypothesis verdict, markdown
- **`pnpm test:sim`** — deterministic self-test

## Env

| Var | Purpose |
|-----|---------|
| `GITHUB_TOKEN` | Private repos / higher GitHub rate limits |
| `FORKTOWN_DB_PATH` | Override SQLite path |
| `FORKTOWN_API_KEY` | CLI auth |
| `FORKTOWN_URL` | CLI base URL |
