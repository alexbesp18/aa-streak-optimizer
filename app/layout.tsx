import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AA Hotel Streak Optimizer',
  description: 'Find optimal points-per-dollar hotel sequences for American Airlines AAdvantage',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}
