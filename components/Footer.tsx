import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-copy">
            © {new Date().getFullYear()} <strong>NewsTodayForYou</strong>. All rights reserved.
          </div>
          <nav className="footer-nav">
            <Link href="/terms">Terms of Use</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/cookies">Cookie Policy</Link>
            <Link href="/ads">Ad Choices</Link>
            <Link href="/accessibility">Accessibility</Link>
            <Link href="/about">About</Link>
            <Link href="/resources">Resources</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
        <div className="footer-disclaimer">
          <p>
            NewsTodayForYou is a news aggregator. We automatically collect and transform news
            headlines and articles from external sources. We are not affiliated with the original
            publishers; all trademarks and content remain the property of their respective owners.
          </p>
          <p className="footer-small">
            NewsTodayForYou aggregates and refreshes news headlines every few hours from trusted global sources.
            This site does not publish user-generated content; all articles originate from verified providers.
          </p>
        </div>
      </div>
    </footer>
  )
}


