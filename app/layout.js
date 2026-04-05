import { DM_Serif_Display, DM_Mono } from 'next/font/google'
import './globals.css'

const serif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
})

const mono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
})

export const metadata = {
  title: 'Sehsüchte',
  description: 'Exhibition app',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}