import type { NextConfig } from 'next'

const API = process.env.API_URL ?? 'http://localhost:5177'

const nextConfig: NextConfig = {
  output: 'standalone',

  // Image optimizer bypassed: browser fetches /uploads/* directly → nginx → API
  images: {
    unoptimized: true,
  },

  // Proxy /uploads/* → API so local dev works without nginx
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
