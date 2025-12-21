export const metadata = {
  title: 'Editorial Policy — NewsTodayForYou',
  description: 'Learn about our editorial standards, sourcing practices, and commitment to accuracy.'
}

export default function EditorialPolicyPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Editorial Policy</h1>
      
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Sources and Content</h2>
      <p>
        NewsTodayForYou aggregates news from reputable feeds and APIs. Our sources include established news organizations and verified news providers. We prioritize accuracy and reliability in our source selection.
      </p>
      <p>
        All articles are processed through automated systems that use AI to rewrite and structure content. This helps us present news in a clear, accessible format while maintaining the essential facts from the original sources.
      </p>

      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Editorial Standards</h2>
      <p>
        <strong>No Fabrication:</strong> We strictly prohibit the fabrication of facts, quotes, statistics, dates, names, or events. All factual claims in our articles must be traceable to the original source material.
      </p>
      <p>
        <strong>Neutral Tone:</strong> We maintain a neutral, journalistic tone in all articles. We avoid sensationalism, clickbait, and biased language. Our goal is to inform, not to persuade.
      </p>
      <p>
        <strong>No Hate Speech:</strong> We do not publish content that promotes hate speech, discrimination, or violence. We are committed to respectful, inclusive coverage.
      </p>
      <p>
        <strong>No Medical, Financial, or Legal Advice:</strong> Our articles provide news and information only. We do not provide medical advice, financial investment advice, or legal counsel. Readers should consult qualified professionals for such matters.
      </p>

      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>AI-Assisted Content</h2>
      <p>
        We use artificial intelligence to assist with rewriting and structuring articles. This helps us:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li>Present information in a clear, accessible format</li>
        <li>Organize content with consistent structure</li>
        <li>Paraphrase source material to avoid duplicate content issues</li>
        <li>Maintain editorial consistency across articles</li>
      </ul>
      <p>
        However, AI is used as a tool to assist our editorial process. All content is reviewed for accuracy and compliance with our editorial standards. We never use AI to invent facts, quotes, or statistics.
      </p>

      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Corrections Policy</h2>
      <p>
        We strive for accuracy, but errors can occur. If you believe you have found an error in our content, please contact us at <a href="mailto:office@newstoday4u.com" style={{ color: '#1d4ed8', textDecoration: 'none' }}>office@newstoday4u.com</a>.
      </p>
      <p>
        When reporting an error, please include:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li>The URL of the article in question</li>
        <li>A description of the error</li>
        <li>If possible, a link to a source that corrects the information</li>
      </ul>
      <p>
        We review all correction requests and will make corrections promptly when errors are confirmed. We are committed to maintaining the trust of our readers through transparency and accountability.
      </p>

      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Editorial Leadership</h2>
      <p>
        <strong>Daniel Bejkovski</strong> serves as Editor-in-Chief, overseeing all editorial operations and ensuring adherence to these policies. Under his leadership, we maintain strict editorial standards and work continuously to improve the quality and accuracy of our content.
      </p>

      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Contact</h2>
      <p>
        For questions about our editorial policy or to report concerns, please contact us at <a href="mailto:office@newstoday4u.com" style={{ color: '#1d4ed8', textDecoration: 'none' }}>office@newstoday4u.com</a>.
      </p>
      <p>
        You can also visit our <a href="/contact" style={{ color: '#1d4ed8', textDecoration: 'none' }}>Contact</a> page for more information.
      </p>
    </div>
  )
}

