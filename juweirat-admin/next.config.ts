import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Proxy des URLs /uploads/* vers l'API pour que les photos des catégories/chambres
  // soient servies depuis app.juweirat.com sans passer par le domaine api. Même pattern
  // que juweirat-web/next.config.ts.
  async rewrites() {
    // Lu au démarrage du server (pas au build) pour honorer l'env du container.
    const API_URL = process.env.API_URL ?? 'http://localhost:5177';
    return [
      {
        source: '/uploads/:path*',
        destination: `${API_URL}/uploads/:path*`,
      },
      // En prod, nginx intercepte /api/* avant Next.js — ce rewrite ne sert jamais.
      // En dev direct (localhost:3001 sans nginx), il permet aux appels API de fonctionner.
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
