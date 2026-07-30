import type { NextConfig } from 'next'

const API = process.env.API_URL ?? 'http://localhost:5177'

const API_HOST = new URL(API).hostname
const API_PORT = new URL(API).port

const nextConfig: NextConfig = {
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: API_HOST,
        ...(API_PORT ? { port: API_PORT } : {}),
        pathname: '/uploads/**',
      },
    ],
  },

  /* Proxy /uploads/* → Laravel storage, so admin-uploaded images work without
     copying files into Next.js public/. Remove this if using shared storage. */
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${API}/uploads/:path*`,
      },
    ]
  },
}

export default nextConfig
