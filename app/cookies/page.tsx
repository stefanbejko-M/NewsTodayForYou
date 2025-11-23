export const metadata = {
  title: 'Cookie Policy — NewsTodayForYou',
  description: 'Information about how we use cookies and how you can manage them.'
}

export default function CookiesPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Cookie Policy</h1>
      <p>
        NewsTodayForYou uses cookies and similar technologies to provide basic site functions, remember your preferences, analyze traffic, and improve our service.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Types of Cookies</h2>
      <p>
        We use several types of cookies:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li><strong>Essential cookies</strong> – required for basic site functionality</li>
        <li><strong>Preferences</strong> – for remembering your choices and settings</li>
        <li><strong>Analytics cookies</strong> – for measuring usage and improving performance</li>
        <li><strong>Advertising cookies</strong> – used by third parties (such as Google AdSense) for personalized ads</li>
      </ul>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Managing Cookies</h2>
      <p>
        You can manage or disable cookies through your browser settings. Please note that disabling certain cookies may affect your experience when using our site.
      </p>
      <p>
        For more information about how we process your data, please see our <a href="/privacy">Privacy Policy</a>.
      </p>
    </div>
  )
}


