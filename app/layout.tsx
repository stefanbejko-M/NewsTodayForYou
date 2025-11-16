import './globals.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Analytics from '../components/Analytics'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

// Safely get metadataBase URL with fallback
function getMetadataBase(): URL {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const fallbackUrl = 'https://newstoday4u.com'
  
  // If env var is missing or empty, use fallback
  if (!siteUrl || !siteUrl.trim()) {
    return new URL(fallbackUrl)
  }
  
  // Try to create URL from env var, catch any errors
  try {
    return new URL(siteUrl)
  } catch {
    // If URL is invalid, use fallback
    return new URL(fallbackUrl)
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: 'NewsTodayForYou',
  description: 'NewsTodayForYou е агрегатор на најнови светски вести – политика, спорт, технологија, игри и повеќе, освежувани на секои 3 часа.',
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'NewsTodayForYou',
    description: 'Ваш прозорец кон светот – свежи вести, автоматски ажурирани.',
    type: 'website',
    url: '/',
    siteName: 'NewsTodayForYou',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NewsTodayForYou',
    description: 'Ваш прозорец кон светот – свежи вести, автоматски ажурирани.',
  },
  robots: { index: true, follow: true },
  other: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { 'google-site-verification': process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Analytics />
        <div className="wrapper">
          <Header />

          <div className="layout">
            <main>{children}</main>
            <aside className="sidebar">
              <div className="side-title">Categories</div>
              <ul style={{listStyle:'none',padding:0,margin:0,lineHeight:'1.9'}}>
                <li><a href="/?q=celebrity">Celebrity</a></li>
                <li><a href="/?q=politics">Politics</a></li>
                <li><a href="/?q=ai-news">AI News</a></li>
                <li><a href="/?q=daily-highlights">Daily Highlights</a></li>
                <li><a href="/?q=sports">Sports</a></li>
                <li><a href="/?q=games">Games</a></li>
              </ul>

              <div className="side-title" style={{marginTop:18}}>Ad</div>
              <div id="ad-rail" style={{width:'100%',minHeight:250,border:'1px solid var(--border)',borderRadius:12}} />
            </aside>
          </div>

          <Footer />
        </div>
      </body>
    </html>
  )
}
