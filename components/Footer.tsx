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
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}


