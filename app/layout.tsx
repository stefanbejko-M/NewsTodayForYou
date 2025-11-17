import './globals.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Analytics from '../components/Analytics'
import Link from 'next/link'
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
  title: {
    default: 'NewsTodayForYou — Fresh News Every Few Hours',
    template: '%s — NewsTodayForYou',
  },
  description: 'Breaking news, trending stories and real-time updates refreshed every few hours. Fast, clean and reliable news coverage.',
  keywords: [
    'news',
    'breaking news',
    'world news',
    'politics',
    'celebrity',
    'AI news',
    'sports',
    'latest updates',
    'daily highlights',
  ],
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/logo-nt.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://newstoday4u.com',
    siteName: 'NewsTodayForYou',
    title: 'NewsTodayForYou — Fresh News Every Few Hours',
    description: 'Breaking news, trending stories and real-time updates refreshed every few hours. Fast, clean and reliable news coverage.',
    images: [
      {
        url: '/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'NewsTodayForYou',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@NewsTodayForYou',
    title: 'NewsTodayForYou — Fresh News Every Few Hours',
    description: 'Breaking news, trending stories and real-time updates refreshed every few hours. Fast, clean and reliable news coverage.',
    images: '/android-chrome-512x512.png',
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
                <li><Link href="/category/celebrity">Celebrity</Link></li>
                <li><Link href="/category/politics">Politics</Link></li>
                <li><Link href="/category/ai-news">AI News</Link></li>
                <li><Link href="/category/daily-highlights">Daily Highlights</Link></li>
                <li><Link href="/category/sports">Sports</Link></li>
                <li><Link href="/category/games">Games</Link></li>
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
