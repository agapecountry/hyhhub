import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { RegisterServiceWorker } from './register-sw';
import type { Metadata, Viewport } from 'next';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Handle Your House - Complete Household Management',
    template: '%s | Handle Your House',
  },
  description: 'Manage budgets, meals, chores, calendars, and more for all your households in one place.',
  keywords: ['household management', 'budget tracking', 'meal planning', 'chore management', 'family calendar'],
  authors: [{ name: 'Agape Country Farms' }],
  creator: 'Agape Country Farms',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Handle Your House',
    title: 'Handle Your House - Complete Household Management',
    description: 'Manage budgets, meals, chores, calendars, and more for all your households in one place.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#178b9c',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/HYHIcon-new.png" />
        <link rel="icon" type="image/png" href="/HYHIcon-new.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Handle Your House" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        <RegisterServiceWorker />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
