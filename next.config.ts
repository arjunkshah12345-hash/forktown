import type { NextConfig } from "next";

const basePath = "/forktown";

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
