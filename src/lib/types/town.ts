import type { Town } from "../sim/types";
import type { RepoFingerprint } from "../github/fingerprint";

export type TownWithMeta = Town & {
  repoUrl?: string | null;
  fingerprint?: RepoFingerprint | null;
  source?: string;
};
