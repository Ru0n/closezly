import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: 'Closezly - AI-powered Sales Co-pilot',
  description: 'Empower high-ticket B2B sales professionals with real-time, on-call guidance, seamless CRM integration, custom knowledge retrieval, and actionable post-call analytics.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
