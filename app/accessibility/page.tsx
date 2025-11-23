export const metadata = {
  title: 'Accessibility — NewsTodayForYou',
  description: 'Our commitment to accessibility and how to reach us for assistance.'
}

export default function AccessibilityPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Accessibility</h1>
      <p>
        NewsTodayForYou is committed to providing an accessible experience for all users. Our goal is to continuously improve our site and ensure that our content can be accessed by people with diverse abilities and technologies.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Our Efforts</h2>
      <p>
        We strive to:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li>Use semantic HTML for better screen reader compatibility</li>
        <li>Provide alternative text for images</li>
        <li>Ensure color contrast that is readable and accessible</li>
        <li>Test with various tools and browsers</li>
      </ul>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Feedback</h2>
      <p>
        If you encounter any accessibility barriers or have suggestions for improvement, please contact us at <a href="mailto:office@newstoday4u.com">office@newstoday4u.com</a> so we can address your concerns.
      </p>
      <p>
        Your feedback is important to us, and we will work to improve the accessibility of our site.
      </p>
    </div>
  )
}


