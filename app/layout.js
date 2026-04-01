export const metadata = {
  title: 'Exhibition',
  description: 'Exhibition app',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}