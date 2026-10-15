import './globals.css'
import { TerminalProvider } from '../components/home/TerminalProvider.jsx'

export const metadata = {
  title: 'Jarvis',
  icons: { icon: '/cmd.png' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TerminalProvider>
          <div className="App">{children}</div>
        </TerminalProvider>
      </body>
    </html>
  )
}
