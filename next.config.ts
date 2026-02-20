import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/public/:path*",
        destination: "/api/published/:path*",
      },
    ];
  },
};

export default nextConfig;
