import type { Metadata, Viewport } from 'next';
import { Limelight, Playfair_Display, Inter, DM_Mono } from 'next/font/google';
import '../styles/globals.css';

const limelight = Limelight({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-limelight',
  display: 'swap',
});
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://athena-chips-production-cb6d.up.railway.app'),
  title: {
    default: 'Athena Chips — Texas Hold\'em Chip Companion',
    template: '%s · Athena Chips',
  },
  description: 'Bring your own deck. Athena tracks chips, blinds, and pots so friends can play Texas Hold\'em anywhere.',
  applicationName: 'Athena Chips',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Athena Chips',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Athena Chips — Texas Hold\'em Chip Companion',
    description: 'Bring your own deck. Athena tracks chips, blinds, and pots so friends can play Texas Hold\'em anywhere.',
    type: 'website',
    siteName: 'Athena Chips',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Athena Chips' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Athena Chips — Texas Hold\'em Chip Companion',
    description: 'Bring your own deck. Athena tracks chips, blinds, and pots so friends can play Texas Hold\'em anywhere.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b3d2e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${limelight.variable} ${playfair.variable} ${inter.variable} ${dmMono.variable}`}>
      <body className="font-body antialiased">
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}
