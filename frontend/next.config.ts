import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This bundles all dependencies into a single .next/standalone directory
  output: 'standalone',

  images: {
    domains: ['api.dicebear.com'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
};

export default nextConfig;
