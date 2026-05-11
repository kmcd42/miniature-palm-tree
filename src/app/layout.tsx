import type { Metadata, Viewport } from 'next';
import { BudgetProvider } from '@/lib/context';
import ServiceWorkerRegistration from '@/components/ServiceWorker';
import './globals.css';

export const metadata: Metadata = {
  title: 'COMPOUND',
  description: 'AETHER-OS financial terminal — budget, wealth, and retirement projection',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'COMPOUND',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#04070A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="COMPOUND" />
      </head>
      <body className="font-sans text-ink-100 antialiased">
        <BudgetProvider>
          <ServiceWorkerRegistration />
          {children}
        </BudgetProvider>
      </body>
    </html>
  );
}
