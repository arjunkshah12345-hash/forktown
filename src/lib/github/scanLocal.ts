import fs from "fs";
import path from "path";
import { buildFingerprint, depsFromPackageJson } from "./fingerprint";
import type { RepoFingerprint } from "./fingerprint";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  "coverage",
  ".data",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
]);

const MAX_FILES = 8000;
const MAX_DEPTH = 12;

function walk(dir: string, root: string, depth: number, out: string[]): void {
  if (out.length >= MAX_FILES || depth > MAX_DEPTH) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (out.length >= MAX_FILES) break;
    if (ent.name.startsWith(".") && ent.name !== ".env.example") {
      if (ent.isDirectory() && ent.name !== ".github") continue;
    }
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(path.join(dir, ent.name), root, depth + 1, out);
    } else if (ent.isFile()) {
      const rel = path.relative(root, path.join(dir, ent.name)).replace(/\\/g, "/");
      out.push(rel);
    }
  }
}

export function ingestLocalRepo(localPath: string): {
  fingerprint: RepoFingerprint;
  packageJson: Record<string, unknown> | null;
  absolutePath: string;
} {
  const absolutePath = path.resolve(localPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Path not found: ${absolutePath}`);
  }
  const stat = fs.statSync(absolutePath);
  if (!stat.isDirectory()) {
    throw new Error("Path must be a directory");
  }

  const paths: string[] = [];
  walk(absolutePath, absolutePath, 0, paths);

  let packageJson: Record<string, unknown> | null = null;
  const pkgPath = path.join(absolutePath, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
    } catch {
      packageJson = null;
    }
  }

  const name = path.basename(absolutePath);
  const fingerprint = buildFingerprint({
    paths,
    depNames: depsFromPackageJson(packageJson),
    meta: {
      owner: "local",
      name,
      fullName: `local/${name}`,
      description: (packageJson?.description as string) ?? null,
      defaultBranch: "HEAD",
      stars: 0,
      language: detectLanguage(paths),
      source: "local",
      localPath: absolutePath,
    },
  });

  return { fingerprint, packageJson, absolutePath };
}

function detectLanguage(paths: string[]): string | null {
  const ext = paths.map((p) => path.extname(p).toLowerCase());
  if (ext.some((e) => e === ".ts" || e === ".tsx")) return "TypeScript";
  if (ext.some((e) => e === ".js" || e === ".jsx")) return "JavaScript";
  if (ext.some((e) => e === ".py")) return "Python";
  if (ext.some((e) => e === ".go")) return "Go";
  if (ext.some((e) => e === ".rs")) return "Rust";
  return null;
}
