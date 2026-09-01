# Forktown launch — X / Twitter pack

**Post window:** Tue–Thu, 8–11am PT (11am–2pm ET)  
**Reply to every comment in the first 2 hours** — velocity matters more than follower count.

Replace `YOUR_URL` with your live deploy (e.g. Vercel preview or production).

---

## What viral launch threads actually do (2025–2026)

| Pattern | Example shape | Why it works |
|--------|----------------|--------------|
| **Problem-first hook** | “I asked 100 remote workers…” (Sprintlane) | Credibility + curiosity before the pitch |
| **Contrarian one-liner** | “Your migration passed CI. Your customers didn’t.” | Stops the scroll for eng leaders |
| **Moment + number** | “After 6 months building in public…” | Signals real work, not vapor |
| **Open loop** | Hook promises payoff in tweet 4–6 | Thread completion rate ↑ |
| **Visual on tweet 3** | GIF / screenshot / OG card | 40–60% more link clicks |
| **3 features max** | Numbered, benefit-led | Feature dumps lose readers |
| **CTA once, at the end** | Single link + one action | Multiple links kill conversion |
| **6–8 tweets total** | Tight, no essay | Drop-off spikes after tweet 9 |

Forktown’s edge: **theater vs world** — issue→PR→tests is the shallow path; subjective buyers + billing/auth surfaces are the real game.

---

## RECOMMENDED — Tweet 1 (hook, standalone)

Attach: `public/launch/og.png`

```
Your migration passed CI.

Your customers didn't.

We built Forktown — SimCity for real codebases.

Connect GitHub → fingerprint billing/auth/migration surfaces → spawn a town of subjective minds → let agents rehearse the cutover before prod bleeds.

Open source. Agent API + CLI.

🧵 how it works ↓
```

**Alt hooks (A/B test as quote-tweet later):**

- *Contrarian:* `Issue → repo → PR → green CI is theater. Real software lives in a world of angry finance, legacy sessions, and buyers who churn on vibes. We made that world playable.`
- *Builder:* `I got tired of agents "fixing" migrations in a vacuum. So we built a town where they have to survive Mara K. before they ship.`
- *Short:* `SimCity for codebases. Agents rehearse before they ship.`

---

## Thread (reply to Tweet 1)

### Tweet 2 — The pain

```
The shallow path:

issue → patch → PR → tests → ship

The real path:

• Finance closes on the 1st
• Legacy auth sessions don't die clean
• Your champion goes on PTO
• Support tickets spike at 2am
• Someone's coupon ghost invoices wrong

CI never simulates that world.
```

### Tweet 3 — The product (attach hero visual)

Attach: screen recording GIF **or** `public/launch/pixel-sample.png` + link to `/sample`

```
Forktown turns your repo into a living town.

GitHub URL or local path → fingerprint surfaces → districts + NPC minds → rehearsal runs with trust curves, war room dialogue, markdown exports.

Not a canned demo. Your tree. Your playbooks.

Try the pixel sample (no login): YOUR_URL/sample
```

### Tweet 4 — Three things (max)

```
Three things agents can do today:

1️⃣ Connect a real repo (GitHub or local)
2️⃣ Rehearse billing / auth / DB migrations at intensity 1–5
3️⃣ Pull reports via CLI + `/api/v1` with agent keys

`pnpm forktown connect https://github.com/org/repo`
```

### Tweet 5 — Why it's different

```
Most "simulation" is load testing.

Forktown models subjective operators:

prospect theory, memory, negotiation, anger when you push cutover too hard.

Your agent doesn't just check correctness — it learns who blocks the migration and why.
```

### Tweet 6 — For agents (dev audience)

```
Built for agents, not slide decks:

• SQLite-backed towns + runs
• `ft_live_…` API keys
• `pnpm forktown rehearse <town> --kind billing --intensity 3`
• Markdown export for the war room

Self-host or run locally in minutes.
```

### Tweet 7 — Social proof / honesty

```
We're early.

But the loop is real: connect → fingerprint → rehearse → export trust + dialogue → iterate before prod.

If you've ever shipped a billing migration with your fingers crossed, this is for you.
```

### Tweet 8 — CTA

```
Forktown is live.

🏠 YOUR_URL
🎮 Retro sample: YOUR_URL/sample
📦 GitHub: [YOUR_REPO_URL]
🔑 Agent keys: YOUR_URL/settings/keys

Connect your repo. Rehearse the cutover. Ship with fewer surprises.

RT if you know a team about to migrate Stripe 😅
```

---

## Follow-up thread (post 24–48h later)

**Goal:** second algorithm wave + show depth without re-launching.

### Follow-up Tweet 1

```
48h after launching Forktown — the question I keep getting:

"Is this just a cute UI?"

No. Here's what actually happens when you connect a repo 🧵
```

### Follow-up Tweet 2

```
Step 1 — Ingest

GitHub tree or local checkout → fingerprint pass finds billing, auth, migration signals in YOUR code (not a template Acme shop).

Output: districts, health/load, suggested playbooks.
```

### Follow-up Tweet 3

```
Step 2 — Rehearse

Pick billing / auth / DB. Set intensity.

Synthetic traffic + subjective minds + incidents + support tickets run against the fingerprint.

You get survivability %, trust sparkline, live log, negotiation turns.
```

### Follow-up Tweet 4

```
Step 3 — Agent loop

```bash
export FORKTOWN_API_KEY=ft_live_…
pnpm forktown rehearse <townId> --kind billing --intensity 3
pnpm forktown report <runId> --markdown
```

Your coding agent can rehearse before opening the PR that touches prod revenue.
```

### Follow-up Tweet 5

```
The pixel RPG at /sample is a skin — same fantasy, different controller.

Production UI is the map + war room + connect flow.

Both are the same thesis: migrations are social simulations, not diff simulations.

YOUR_URL
```

---

## Asset checklist

| Asset | Path | Use |
|-------|------|-----|
| OG / link preview | `public/launch/og.png` | Tweet 1 attachment, site OG, LinkedIn |
| Pixel sample square | `public/launch/pixel-sample.png` | Tweet 3, Instagram, follow-up |
| **Record (you)** | 15–30s screen capture | Connect → town → rehearse → war room (best performer) |
| **Record (you)** | 10s GIF | `/sample` rehearse + combo banner |

Metadata wired in `src/app/layout.tsx` → `/launch/og.png` for Twitter cards once deployed.

---

## Posting playbook

1. **Pre-launch (optional):** 2–3 teasers — screenshot of war room, CLI one-liner, “shipping Tuesday”
2. **Launch:** Tweet 1 + thread; pin nothing (let it circulate)
3. **+30 min:** Reply to every comment with a specific detail (not “thanks!”)
4. **+4h:** Quote-tweet your hook with the demo GIF
5. **+24–48h:** Follow-up thread above
6. **Tags (sparingly):** `#buildinpublic` `#devtools` `#aiagents` — max 1–2 per tweet

---

## One-line bios (profile)

- `SimCity for codebases · agents rehearse migrations before prod`
- `Where agents rehearse before they ship · GitHub → town → cutover sim`
