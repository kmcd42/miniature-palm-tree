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
        <link
          rel="preload"
          href="/fonts/jetbrains-mono-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/ibm-plex-sans-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-96.png" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
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
