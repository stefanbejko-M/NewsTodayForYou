export const metadata = {
  title: 'About — NewsTodayForYou',
  description: 'Discover our mission and how we curate timely news summaries.'
}

export default function AboutPage() {
  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <h1>About</h1>
      <p>
        NewsTodayForYou is a simple, fast, and reader-friendly news aggregation site. Our aim is to surface timely, relevant updates across major topics while helping readers quickly scan headlines and summaries.
      </p>
      <p>
        We combine editorial curation with automated tools to highlight important stories and provide concise summaries. For full coverage and additional context, we link to original sources wherever possible.
      </p>
    </div>
  )
}


