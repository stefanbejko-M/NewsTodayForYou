export const metadata = {
  title: 'Contact – NewsTodayForYou',
  description: 'Contact NewsTodayForYou for business inquiries, technical issues, content removal requests, or general questions.',
}

export default function ContactPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Contact</h1>
      <p>
        Welcome to our contact page. Please use the email address below for any questions or requests related to the site.
      </p>
      <p>
        <strong>Email:</strong> <a href="mailto:office@newstoday4u.com">office@newstoday4u.com</a>
      </p>
      <p>
        This email is available for:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li><strong>Business inquiries</strong> – partnerships, advertising, sponsorships</li>
        <li><strong>Reporting issues</strong> – technical problems, incorrect or outdated information</li>
        <li><strong>Content removal requests</strong> – DMCA requests, copyright issues</li>
        <li><strong>General questions</strong> – feedback, suggestions, other inquiries</li>
      </ul>
      <p>
        We aim to respond as quickly as possible, usually within 48 hours.
      </p>
    </div>
  )
}


