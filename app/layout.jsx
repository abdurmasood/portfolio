import '../src/index.css'
import '../src/App.css'
import { TerminalProvider } from '../src/components/Terminal/TerminalContext.jsx'

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
