import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-ignore: Next.js 15 types sometimes miss the turbo key
    turbo: {
      root: __dirname,
    },
  },
};

export default nextConfig;
