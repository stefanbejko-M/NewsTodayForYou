import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resources & Explainers – NewsTodayForYou',
  description:
    'In-depth explainers and evergreen resources from NewsTodayForYou on politics, technology, conflicts, finance and more.',
}

export default function ResourcesPage() {
  return (
    <main className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1 className="page-title">Resources &amp; Explainers</h1>
      <p className="page-intro">
        This section is dedicated to longer-form articles that stay useful over time:
        background explainers, guides, timelines and deep dives on the biggest stories
        in politics, technology, conflicts, finance and more.
      </p>

      <section className="evergreen-section">
        <h2>What you can expect here</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Background explainers for complex news stories</li>
          <li>Guides and how-tos on major topics (economy, tech, elections, etc.)</li>
          <li>Timelines that summarize how key events unfolded</li>
          <li>Collections of related articles and resources</li>
        </ul>
        <p>
          We will be gradually adding new evergreen content here. For now, you can
          browse the latest headlines on the homepage or explore categories like
          Politics, AI News, Sports and Games.
        </p>
      </section>
    </main>
  )
}


