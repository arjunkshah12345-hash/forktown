import { buildFingerprint, depsFromPackageJson, type RepoFingerprint } from "./fingerprint";

export type { RepoFingerprint } from "./fingerprint";

function parseGithubUrl(input: string): { owner: string; name: string } | null {
  const cleaned = input.trim().replace(/\.git$/, "");
  const m =
    cleaned.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i) ||
    cleaned.match(/^github\.com\/([^/]+)\/([^/#?]+)/i) ||
    cleaned.match(/^([^/]+)\/([^/]+)$/);
  if (!m) return null;
  return { owner: m[1]!, name: m[2]! };
}

async function gh<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "forktown-ingest",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const t = token || process.env.GITHUB_TOKEN;
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`https://api.github.com${path}`, { headers, next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function ghText(path: string, token?: string): Promise<string | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw",
    "User-Agent": "forktown-ingest",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const t = token || process.env.GITHUB_TOKEN;
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`https://api.github.com${path}`, { headers, next: { revalidate: 0 } });
  if (!res.ok) return null;
  return res.text();
}

interface GhRepo {
  full_name: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  language: string | null;
  topics?: string[];
  owner: { login: string };
  name: string;
}

interface GhTree {
  tree: Array<{ path: string; type: string }>;
}

export async function ingestGithubRepo(repoUrl: string): Promise<{
  fingerprint: RepoFingerprint;
  packageJson: Record<string, unknown> | null;
}> {
  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) throw new Error("Invalid GitHub URL. Use https://github.com/owner/repo");

  const repo = await gh<GhRepo>(`/repos/${parsed.owner}/${parsed.name}`);
  const tree = await gh<GhTree>(
    `/repos/${parsed.owner}/${parsed.name}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`,
  );

  const paths = tree.tree.filter((t) => t.type === "blob").map((t) => t.path);

  const pkgRaw = await ghText(
    `/repos/${parsed.owner}/${parsed.name}/contents/package.json?ref=${encodeURIComponent(repo.default_branch)}`,
  );
  let packageJson: Record<string, unknown> | null = null;
  if (pkgRaw) {
    try {
      packageJson = JSON.parse(pkgRaw) as Record<string, unknown>;
    } catch {
      packageJson = null;
    }
  }

  const fingerprint = buildFingerprint({
    paths,
    depNames: depsFromPackageJson(packageJson),
    meta: {
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      defaultBranch: repo.default_branch,
      stars: repo.stargazers_count,
      language: repo.language,
      topics: repo.topics ?? [],
      source: "github",
    },
  });

  return { fingerprint, packageJson };
}

export { parseGithubUrl };
