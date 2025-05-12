export const metadata = {
  title: 'Web Crawler',
  description: 'Fast and efficient web crawler by Casey Friedrich',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
