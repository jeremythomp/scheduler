import type { NextConfig } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const { hostname, port } = new URL(appUrl)
const allowedOrigin = `${hostname}${port ? `:${port}` : ''}`

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: [allowedOrigin],
    },
  },
};

export default nextConfig;
