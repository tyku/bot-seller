import type { NextConfig } from "next";

const proxyTimeoutMs = Number(process.env.NEXT_PROXY_TIMEOUT_MS ?? "120000");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    proxyTimeout: Number.isFinite(proxyTimeoutMs) ? proxyTimeoutMs : 120000,
  },
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
