import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 0

// Types
// Note: keep existing fields; add optional image_url for thumbnail rendering

type Row = { 
  id?: number | null
  title: string | null
  slug: string | null
  created_at: string | null
  source_name: string | null
  body?: string | null
  excerpt?: string | null
  image_url?: string | null
}

export default async function Home() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('[HOME DEBUG] env url?', !!supabaseUrl, 'key?', !!supabaseKey)

    if (!supabaseUrl || !supabaseKey) {
      console.error('[PAGE ERROR] Missing Supabase environment variables')

      const missingVars =
        [
          !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
          !supabaseKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : null
        ]
          .filter(Boolean)
          .join(', ') || 'none'

      return (
        <div>
          <p>Failed to load posts (missing env vars).</p>
          <pre style={{ fontSize: '12px', color: '#999', whiteSpace: 'pre-wrap' }}>
            Missing: {missingVars}
          </pre>
        </div>
      )
    }

    const client = createClient(supabaseUrl, supabaseKey)

    // Last 24 hours: only show fresh news on the homepage
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await client
      .from('post')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) {
      let errorMsg = 'Unknown error'
      try {
        errorMsg = error instanceof Error ? error.message : JSON.stringify(error)
      } catch {
        errorMsg = String(error)
      }
      console.error('[HOME PAGE ERROR]', error)
      return (
        <div>
          <p>Failed to load posts.</p>
          <pre style={{ fontSize: '12px', color: '#999', whiteSpace: 'pre-wrap' }}>
            {errorMsg}
          </pre>
        </div>
      )
    }

    // Ensure data is an array
    const rows: Row[] = Array.isArray(data) ? data as any : []

    // Normalize posts for rendering
    const validPosts = rows
      .filter((p) => {
        if (!p.slug || typeof p.slug !== 'string') return false
        return true
      })
      .map((p) => ({
        title: typeof p.title === 'string' ? p.title : 'Untitled',
        slug: p.slug!,
        source_name: typeof p.source_name === 'string' ? p.source_name : null,
        excerpt: typeof p.excerpt === 'string' ? p.excerpt : (typeof p.body === 'string' ? p.body.slice(0, 200) : ''),
        image_url: typeof (p as any).image_url === 'string' ? (p as any).image_url as string : null,
        created_at: p.created_at || null
      }))

    return (
      <div>
        <section className="home-intro">
          <h1>Latest News</h1>
          <p>
            Welcome to NewsTodayForYou – a fast, clean overview of the latest stories from around
            the world, updated several times per day.
          </p>
        </section>
        {validPosts.length === 0 ? (
          <p style={{ color: '#666', padding: '20px 0' }}>
            No articles yet. Check back soon!
          </p>
        ) : (
          <ul className="article-list">
            {validPosts.map((p) => (
              <li key={p.slug} className="article-card">
                {p.image_url ? (
                  <a className="article-thumb" href={`/news/${p.slug}`}>
                    <img className="article-image" src={p.image_url} alt={p.title || ''} loading="lazy" />
                  </a>
                ) : null}
                <div className="article-content">
                  <h2 className="article-title">
                    <Link href={`/news/${p.slug}`}>{p.title}</Link>
                  </h2>
                  {p.source_name && (
                    <div className="article-meta"><small>{p.source_name}</small></div>
                  )}
                  {p.excerpt ? (
                    <p className="article-excerpt">{p.excerpt}</p>
                  ) : null}
                  {p.created_at ? (
                    <div className="article-meta">
                      <small>{new Date(p.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</small>
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
