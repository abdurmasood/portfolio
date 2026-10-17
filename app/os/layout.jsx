import localFont from 'next/font/local'

// Variable fonts (Google Fonts latin subsets): one file covers every weight rafeyOS uses (300-700)
const uiFont = localFont({
  src: './fonts/UbuntuSans-latin.woff2',
  weight: '100 800',
  style: 'normal',
  variable: '--font-ui',
  display: 'swap',
})

const monoFont = localFont({
  src: './fonts/UbuntuSansMono-latin.woff2',
  weight: '400 700',
  style: 'normal',
  variable: '--font-mono',
  display: 'swap',
})

export const metadata = {
  title: 'rafeyOS',
}

export default function RafeyOSLayout({ children }) {
  return <div className={`${uiFont.variable} ${monoFont.variable}`}>{children}</div>
}
