import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 0

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
      .select('title, slug, created_at, source_name, body, excerpt, views, image_url')
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
        image_url: (p as any).image_url && typeof (p as any).image_url === 'string' ? (p as any).image_url as string : null
      }))

    return (
      <div>
        <h1>Trending</h1>
        {validPosts.length === 0 ? (
          <p style={{ color: '#666', padding: '20px 0' }}>
            No trending articles yet. Check back soon!
          </p>
        ) : (
          <ul>
            {validPosts.map((p) => (
              <li key={p.slug}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title || ''} style={{ maxWidth: '100%', height: 'auto', marginBottom: 8 }} />
                ) : null}
                <Link href={`/news/${p.slug}`}>{p.title}</Link>
                {p.source_name && (
                  <> <small>({p.source_name})</small></>
                )}
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

