#!/usr/bin/env node
/**
 * Forktown agent CLI — rehearse against a real town.
 *
 *   export FORKTOWN_API_KEY=ft_live_…
 *   export FORKTOWN_URL=http://localhost:3000
 *   node bin/forktown.mjs connect https://github.com/org/repo
 *   node bin/forktown.mjs connect-local /path/to/repo
 *   node bin/forktown.mjs resync TOWN_ID
 *   node bin/forktown.mjs rehearse TOWN_ID --kind billing --intensity 3
 *   node bin/forktown.mjs run RUN_ID
 *   node bin/forktown.mjs report RUN_ID --markdown
 */

const base = (process.env.FORKTOWN_URL || "http://localhost:3000").replace(/\/$/, "");
const key = process.env.FORKTOWN_API_KEY || "";

async function api(path, { method = "GET", body, auth = true } = {}) {
  if (auth && !key) {
    console.error("Set FORKTOWN_API_KEY (mint at /settings/keys)");
    process.exit(1);
  }
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(auth ? { Authorization: `Bearer ${key}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/markdown")) {
    if (!res.ok) {
      console.error(await res.text());
      process.exit(1);
    }
    return res.text();
  }
  const data = await res.json();
  if (!res.ok) {
    console.error(data.error || res.statusText);
    process.exit(1);
  }
  return data;
}

const [,, cmd, ...rest] = process.argv;

async function main() {
  if (cmd === "connect") {
    const repoUrl = rest[0];
    if (!repoUrl) {
      console.error("Usage: forktown connect <github-url>");
      process.exit(1);
    }
    const data = await api("/api/v1/towns", { method: "POST", body: { repoUrl } });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === "connect-local") {
    const localPath = rest[0];
    if (!localPath) {
      console.error("Usage: forktown connect-local </absolute/path>");
      process.exit(1);
    }
    const data = await api("/api/v1/towns/from-local", {
      method: "POST",
      body: { localPath },
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === "resync") {
    const townId = rest[0];
    if (!townId) {
      console.error("Usage: forktown resync <townId>");
      process.exit(1);
    }
    const data = await api(`/api/towns/${townId}/resync`, { method: "POST", auth: false });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === "towns") {
    const data = await api("/api/v1/towns");
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === "rehearse") {
    const townId = rest[0];
    if (!townId) {
      console.error("Usage: forktown rehearse <townId> [--kind billing] [--intensity 3] [--title …]");
      process.exit(1);
    }
    const kindIdx = rest.indexOf("--kind");
    const intIdx = rest.indexOf("--intensity");
    const titleIdx = rest.indexOf("--title");
    const kind = kindIdx >= 0 ? rest[kindIdx + 1] : "billing";
    const intensity = intIdx >= 0 ? Number(rest[intIdx + 1]) : 3;
    const title = titleIdx >= 0 ? rest[titleIdx + 1] : `${kind} migration rehearsal`;
    const data = await api(`/api/v1/towns/${townId}/rehearse`, {
      method: "POST",
      body: {
        kind,
        title,
        hypothesis: "Agent dual-write + flags should survive subjective town pressure.",
        agentName: process.env.FORKTOWN_AGENT_NAME || "cli-agent",
        intensity,
      },
    });
    console.log(JSON.stringify(data, null, 2));
    console.log(`\nOpen ${base}${data.run.url}`);
    return;
  }

  if (cmd === "run") {
    const runId = rest[0];
    if (!runId) {
      console.error("Usage: forktown run <runId>");
      process.exit(1);
    }
    const data = await api(`/api/v1/runs/${runId}`);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === "report") {
    const runId = rest[0];
    const markdown = rest.includes("--markdown");
    if (!runId) {
      console.error("Usage: forktown report <runId> [--markdown]");
      process.exit(1);
    }
    if (markdown) {
      const md = await api(`/api/runs/${runId}/export`, { auth: false });
      console.log(md);
      return;
    }
    const data = await api(`/api/v1/runs/${runId}`);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === "health") {
    const data = await api("/api/health", { auth: false });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`Forktown CLI

  connect <github-url>       Ingest GitHub repo → found town
  connect-local <path>       Ingest local checkout (server must see path)
  resync <townId>            Re-fingerprint town from source
  towns                      List towns
  rehearse <townId>          Run migration rehearsal
  run <runId>                Fetch survival report (JSON)
  report <runId> [--markdown] Export report
  health                     Service + DB health

Env: FORKTOWN_API_KEY  FORKTOWN_URL  FORKTOWN_AGENT_NAME
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
