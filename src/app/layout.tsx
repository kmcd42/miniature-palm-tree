import type { Metadata, Viewport } from 'next';
import { BudgetProvider } from '@/lib/context';
import ServiceWorkerRegistration from '@/components/ServiceWorker';
import './globals.css';

export const metadata: Metadata = {
  title: 'Budget Clarity',
  description: 'Your personal wealth dashboard - weekly budget, long-term wealth projections',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Budget Clarity',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#667eea' },
    { media: '(prefers-color-scheme: dark)', color: '#1C1C1E' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="text-gray-900 dark:text-white">
        <BudgetProvider>
          <ServiceWorkerRegistration />
          {children}
        </BudgetProvider>
      </body>
    </html>
  );
}
