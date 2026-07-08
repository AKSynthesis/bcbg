import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7's generated client + the pg driver adapter should run as real
  // Node modules, not get bundled by Turbopack — bundling them causes
  // module-resolution errors at runtime.
  serverExternalPackages: ["@prisma/client", "pg"],
};

export default nextConfig;
