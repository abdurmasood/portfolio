import './globals.css'
import { JetBrains_Mono } from 'next/font/google'
import { TerminalProvider } from '../components/home/TerminalProvider.jsx'
import { Analytics } from '@vercel/analytics/next'

const terminalFont = JetBrains_Mono({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-terminal',
  display: 'swap',
})

export const metadata = {
  title: 'Jarvis',
  icons: { icon: '/cmd.png' },
}

// maximumScale stops iOS Safari zooming in when the sub-16px terminal input is focused
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={terminalFont.variable}>
      <body>
        <TerminalProvider>
          <div className="App">{children}</div>
        </TerminalProvider>
        <Analytics />
      </body>
    </html>
  )
}
