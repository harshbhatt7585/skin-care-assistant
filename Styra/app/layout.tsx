import type { Metadata } from 'next'
import '../src/index.css'

export const metadata: Metadata = {
  title: 'Styra',
  description: 'AI shopping assistant',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
