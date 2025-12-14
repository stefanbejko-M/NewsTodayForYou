import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search news - NewsTodayForYou',
  description: 'Search the latest worldwide news on NewsTodayForYou by keyword, topic, or source.',
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}


