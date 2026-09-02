export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix app-relative paths (API, downloads) when hosted under a basePath. */
export function withBase(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}`;
}
