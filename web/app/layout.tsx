import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Side — a quiet second brain',
  description:
    'Notion-easy editor, Obsidian-deep linking. Plain markdown files on your Mac. No cloud, no lock-in.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Side — a quiet second brain',
    description:
      'Notion-easy editor, Obsidian-deep linking. Plain markdown files on your Mac.',
    type: 'website',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper text-ink">{children}</body>
    </html>
  );
}
