export const metadata = {
  title: 'Terms of Use — NewsTodayForYou',
  description: 'Understand the terms and conditions that govern your use of NewsTodayForYou.'
}

export default function TermsPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Terms of Use</h1>
      <p>
        By accessing or using this website, you agree to be bound by these Terms of Use. NewsTodayForYou provides news summaries and links for informational purposes only.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>User Obligations</h2>
      <p>
        You agree to:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li>Not misuse the site or attempt to disrupt our service</li>
        <li>Not violate the rights of other users or third parties</li>
        <li>Not use automated systems for scraping or bulk data collection without permission</li>
        <li>Not post content that is illegal, offensive, or violates copyright</li>
      </ul>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Limitation of Liability</h2>
      <p>
        We do not guarantee the accuracy, completeness, or timeliness of content. All news is aggregated from external sources and may contain errors. You use the site at your own risk.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Intellectual Property</h2>
      <p>
        All trademarks, logos, and content remain the property of their respective owners. NewsTodayForYou does not claim ownership over original sources. If you believe your rights have been violated, please contact us at <a href="mailto:office@newstoday4u.com">office@newstoday4u.com</a>.
      </p>
      <p>
        We may update these terms from time to time. Continued use of the site after changes indicates your acceptance of the new terms.
      </p>
    </div>
  )
}


