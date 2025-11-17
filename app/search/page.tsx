'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useSearchParams } from 'next/navigation'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{
    title: string
    slug: string
    source_name: string | null
    excerpt: string
    image_url: string | null
    created_at: string
  }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const params = useSearchParams()

  // Read initial query from URL params
  useEffect(() => {
    const initialQ = params.get('q')
    if (initialQ) {
      setQ(initialQ)
    }
  }, [params])

  // Search with debounce
  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const t = setTimeout(async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error: searchError } = await supabase
          .from('post')
          .select('title, slug, created_at, source_name, excerpt, body, image_url')
          .or(`title.ilike.%${q.trim()}%,body.ilike.%${q.trim()}%,excerpt.ilike.%${q.trim()}%`)
          .order('created_at', { ascending: false })
          .limit(20)

        if (searchError) {
          console.error('[SEARCH PAGE ERROR]', searchError)
          setError('Failed to search. Please try again.')
          setResults([])
        } else {
          // Normalize results
          const normalized = (data || []).map((post) => ({
            title: typeof post.title === 'string' ? post.title : 'Untitled',
            slug: post.slug || '',
            source_name: typeof post.source_name === 'string' ? post.source_name : null,
            excerpt:
              typeof post.excerpt === 'string'
                ? post.excerpt
                : typeof post.body === 'string'
                  ? post.body.slice(0, 200)
                  : '',
            image_url: typeof post.image_url === 'string' ? post.image_url : null,
            created_at: post.created_at || new Date().toISOString(),
          }))

          setResults(normalized.filter((p) => p.slug)) // Filter out posts without slug
        }
      } catch (err) {
        console.error('[SEARCH PAGE ERROR]', err)
        setError('An error occurred while searching.')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <h1>Search</h1>
      <input
        type="text"
        className="search-input"
        placeholder="Search news by keyword, topic, or source…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: '100%',
          maxWidth: '600px',
          padding: '12px 16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '16px',
          marginTop: '16px',
          marginBottom: '24px',
        }}
      />

      {error && (
        <p style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>
      )}

      {loading && (
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>Searching…</p>
      )}

      {!loading && q.trim().length < 3 && (
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Start typing to search the latest news.
        </p>
      )}

      {!loading && q.trim().length >= 3 && results.length === 0 && !error && (
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          No results found for &quot;{q}&quot;. Try another keyword.
        </p>
      )}

      {!loading && results.length > 0 && (
        <ul className="article-list">
          {results.map((post) => (
            <li key={post.slug} className="article-card">
              {post.image_url ? (
                <a className="article-thumb" href={`/news/${post.slug}`}>
                  <img
                    className="article-image"
                    src={post.image_url}
                    alt={post.title || ''}
                    loading="lazy"
                  />
                </a>
              ) : null}
              <div className="article-content">
                <h2 className="article-title">
                  <Link href={`/news/${post.slug}`}>{post.title}</Link>
                </h2>
                {post.source_name && (
                  <div className="article-meta">
                    <small>{post.source_name}</small>
                  </div>
                )}
                {post.excerpt ? (
                  <p className="article-excerpt">{post.excerpt}</p>
                ) : null}
                {post.created_at ? (
                  <div className="article-meta">
                    <small>
                      {new Date(post.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </small>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
