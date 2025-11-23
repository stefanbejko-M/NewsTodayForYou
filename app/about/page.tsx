export const metadata = {
  title: 'About — NewsTodayForYou',
  description: 'Discover our mission and how we curate timely news summaries.'
}

export default function AboutPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>About</h1>
      <p>
        NewsTodayForYou is a news aggregator that automatically collects and processes the latest news from trusted sources. Our goal is to provide you with an easy overview of world news with a focus on relevance and accuracy.
      </p>
      <p>
        We use external sources and automated systems for news processing. News is refreshed every few hours to keep you informed about the most important events. For complete coverage and additional context, whenever possible, we cite the original sources.
      </p>
      <p>
        <strong>Important:</strong> NewsTodayForYou is a news aggregator that uses external sources and automated systems for news processing. We are not affiliated with original publishers; their trademarks and content remain the property of their respective owners.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Categories</h2>
      <p>We cover the following news categories:</p>
      <ul style={{ lineHeight: '1.8' }}>
        <li><strong>Politics</strong> – elections, government decisions, international relations</li>
        <li><strong>Sports</strong> – football, basketball, tennis, Olympic games, and other sports</li>
        <li><strong>Technology</strong> – AI news, innovations, software and hardware</li>
        <li><strong>Games</strong> – video games, esports, console and PC games</li>
        <li><strong>Celebrity</strong> – news about public figures, entertainment, and culture</li>
        <li><strong>Daily Highlights</strong> – general news and important events</li>
      </ul>
    </div>
  )
}


