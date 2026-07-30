import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Juweirat Admin',
  description: 'Backoffice — Résidence Juweirat',
  icons: { icon: '/img/logo.png', apple: '/img/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
