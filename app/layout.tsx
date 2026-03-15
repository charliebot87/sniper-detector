import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SimpleDEX Sniper Detector 🎯',
  description: 'Exposing bot accounts systematically sniping new token launches on SimpleDEX',
  openGraph: { images: ["/og-image.jpg"],
    title: 'SimpleDEX Sniper Detector',
    description: 'Find and expose sniper bots on SimpleDEX token launches',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
