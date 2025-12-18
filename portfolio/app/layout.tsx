import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kasey McDonnell | Designer, Writer, and Marketer',
  description: 'Portfolio of Kasey McDonnell - a designer, writer, and marketer who excels at delivering engaging and audience-focused creative solutions.',
  keywords: ['designer', 'writer', 'marketer', 'photography', 'portfolio', 'New Zealand'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Navigation />
        <main className="pt-20">
          {children}
        </main>
      </body>
    </html>
  )
}
