export const metadata = {
  title: 'Privacy Policy — NewsTodayForYou',
  description: 'Learn how NewsTodayForYou collects, uses, and protects your information.'
}

export default function PrivacyPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Privacy Policy</h1>
      <p>
        NewsTodayForYou values your right to privacy. This policy describes how we collect, use, and protect your information.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Data We Collect</h2>
      <p>
        We collect limited information necessary for operation and improvement of our service:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li><strong>User data</strong> – basic usage statistics, IP addresses (for security and analytics)</li>
        <li><strong>Cookies</strong> – for preferences, analytics, and advertising</li>
        <li><strong>Logs</strong> – information about page access and errors</li>
      </ul>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>How We Use Data</h2>
      <p>
        We use data to:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li>Provide and improve our service</li>
        <li>Display relevant content and advertisements</li>
        <li>Measure performance and analyze trends</li>
        <li>Protect against abuse and ensure security</li>
      </ul>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Third Parties</h2>
      <p>
        We work with third-party partners, including advertising networks (such as Google AdSense) and analytics providers, who may use cookies or similar technologies. These partners have their own privacy policies.
      </p>
      <p>
        <strong>We do not sell your personal data.</strong> You can manage cookie preferences through your browser settings.
      </p>
      <p>
        If you have questions about this policy or our data practices, please contact us at <a href="mailto:office@newstoday4u.com">office@newstoday4u.com</a>.
      </p>
    </div>
  )
}


