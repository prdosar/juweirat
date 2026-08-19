import type { NextConfig } from 'next';
import path from 'path';

// Serveur API pour la réécriture /uploads/* (photos uploadées via l'admin).
// En prod (Docker), API_URL pointe sur juweirat-api:8080 ; en dev fallback sur localhost:5177.
const API_URL = process.env.API_URL ?? 'http://localhost:5177';

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
    return [
      {
        source: '/uploads/:path*',
        destination: `${API_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
