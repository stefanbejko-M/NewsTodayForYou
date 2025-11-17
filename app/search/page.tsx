import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search | NewsTodayForYou',
  description: 'Search the latest news on NewsTodayForYou',
}

export default function SearchPage() {
  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <h1>Search</h1>
      <p style={{ marginTop: '8px', color: '#4b5563' }}>
        Use the search bar at the top to find news by keyword, topic, or source.
      </p>
    </div>
  )
}

