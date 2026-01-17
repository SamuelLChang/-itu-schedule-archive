import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql", "better-sqlite3", "@prisma/adapter-libsql"],
};

export default nextConfig;
