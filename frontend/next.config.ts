import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:9022";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
