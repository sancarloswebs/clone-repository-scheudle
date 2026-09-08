import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx", "pg", "bcryptjs"],
};

export default nextConfig;
