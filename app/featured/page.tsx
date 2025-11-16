import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

export const revalidate = 0

export const metadata: Metadata = {
  title: 'Trending News – NewsTodayForYou',
  description: 'Најкликани вести во последни 6 часа. NewsTodayForYou ви ги прикажува најпопуларните статии според бројот на прегледи.',
  openGraph: {
    title: 'Trending News – NewsTodayForYou',
    description: 'Најкликани вести во последни 6 часа. NewsTodayForYou ви ги прикажува најпопуларните статии според бројот на прегледи.',
    type: 'website',
    siteName: 'NewsTodayForYou',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trending News – NewsTodayForYou',
    description: 'Најкликани вести во последни 6 часа. NewsTodayForYou ви ги прикажува најпопуларните статии според бројот на прегледи.',
  },
}

type Row = { 
  title: string | null
  slug: string | null
  created_at: string | null
  source_name: string | null
  body?: string | null
  excerpt?: string | null
  views?: number | null
  image_url?: string | null
}

export default async function Featured() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[PAGE ERROR] Missing Supabase environment variables')
      return <div>Failed to load posts.</div>
    }

    const client = createClient(supabaseUrl, supabaseKey)
    
    // Trending posts: last 6 hours, ordered by views desc (then created_at desc)
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()

    const { data, error } = await client
      .from('post')
      .select('*')
      .gte('created_at', since)
      .order('views', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) {
      let errorMsg = 'Unknown error'
      try {
        errorMsg = error instanceof Error ? error.message : JSON.stringify(error)
      } catch {
        errorMsg = String(error)
      }
      console.error('[PAGE ERROR]', errorMsg)
      return <div>Failed to load posts.</div>
    }

    // Ensure data is an array
    const rows: Row[] = Array.isArray(data) ? data : []

    // Filter and validate posts
    const validPosts = rows
      .filter((p) => {
        // Skip posts without slug
        if (!p.slug || typeof p.slug !== 'string') {
          return false
        }
        return true
      })
      .map((p) => ({
        title: typeof p.title === 'string' ? p.title : 'Untitled',
        slug: p.slug!,
        source_name: typeof p.source_name === 'string' ? p.source_name : null,
        excerpt: typeof p.excerpt === 'string' ? p.excerpt : (typeof p.body === 'string' ? p.body.slice(0, 200) : ''),
        image_url: typeof (p as any).image_url === 'string' ? (p as any).image_url as string : null,
        created_at: (p as any).created_at || null
      }))

      return (
        <div>
          <h1>Trending News</h1>
          <p style={{ color: '#4b5563', marginBottom: '24px', maxWidth: '640px' }}>
            Најкликани вести во последни 6 часа. NewsTodayForYou ви ги прикажува најпопуларните статии според бројот на прегледи.
          </p>
          {validPosts.length === 0 ? (
            <p style={{ color: '#666', padding: '20px 0' }}>
              No trending articles yet. Check back soon!
            </p>
          ) : (
            <ul className="article-list">
              {validPosts.map((p) => (
                <li key={p.slug} className="article-card">
                  {p.image_url ? (
                    <a className="article-thumb" href={`/news/${p.slug}`}>
                      <img className="article-image" src={p.image_url} alt={p.title || ''} />
                    </a>
                  ) : null}
                  <div className="article-content">
                    <h2 className="article-title">
                      <Link href={`/news/${p.slug}`}>{p.title}</Link>
                    </h2>
                    {p.source_name ? (
                      <div className="article-meta"><small>{p.source_name}</small></div>
                    ) : null}
                    {p.excerpt ? (
                      <p className="article-excerpt">{p.excerpt}</p>
                    ) : null}
                    {p.created_at ? (
                      <div className="article-meta">
                        <small>{new Date(p.created_at as any).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</small>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[PAGE ERROR]', errorMessage)
    return <div>Failed to load posts.</div>
  }
}

