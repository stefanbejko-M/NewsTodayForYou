import './globals.css'
import { Suspense } from 'react'
import Header from '../components/Header'
import Analytics from '../components/Analytics'

export const dynamic = 'force-dynamic'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'NewsTodayForYou', template: '%s · NewsTodayForYou' },
  description: 'Fast, legal, summarized breaking news for EN markets.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'NewsTodayForYou',
    url: '/',
    title: 'NewsTodayForYou',
    description: 'Fast, legal, summarized breaking news for EN markets.'
  },
  robots: { index: true, follow: true }
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
                <li><a href="/?q=Celebrity">Celebrity</a></li>
                <li><a href="/?q=Politics">Politics</a></li>
                <li><a href="/?q=AI">AI News</a></li>
                <li><a href="/?q=Daily">Daily Highlights</a></li>
              </ul>

              <div className="side-title" style={{marginTop:18}}>Ad</div>
              <div id="ad-rail" style={{width:'100%',minHeight:250,border:'1px solid var(--border)',borderRadius:12}} />
            </aside>
          </div>

          <footer className="footer">© {new Date().getFullYear()} NewsTodayForYou — All rights reserved.</footer>
        </div>
      </body>
    </html>
  )
}
