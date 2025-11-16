'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ title: string; slug: string }[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const params = useSearchParams()

  // Read query param on mount and auto-open dropdown if present
  useEffect(() => {
    const initial = params.get('q')
    if (initial && !open) {
      setQ(initial)
      setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // авто-пребарување со debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return }
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data } = await supabase
        .from('post')
        .select('title, slug')
        .ilike('title', `%${q.trim()}%`)
        .limit(20)
      setResults(data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  // ESC за затворање + клик надвор
  useEffect(() => {
    function onKey(e: KeyboardEvent){ if(e.key === 'Escape') setOpen(false) }
    function onClick(e: MouseEvent){
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      window.addEventListener('keydown', onKey)
      window.addEventListener('mousedown', onClick)
    }
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <>
      <header className="header">
        <div className="brand">
          <img src="/logo.svg" alt="logo" />
          <span>NewsTodayForYou</span>
        </div>

        <nav className="nav">
          <Link href="/">Home</Link>
          <button
            onClick={() => setOpen(v => !v)}
            className="nav-btn"
          >
            Search
          </button>
          <Link href="/featured">Trending</Link>
        </nav>
      </header>

      {open && (
        <div className="search-panel" ref={panelRef}>
          <input
            type="text"
            className="search-input"
            placeholder="Search news… e.g. Trump"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {q.trim() && (
            <div className="search-results">
              {results.length > 0 ? (
                results.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/news/${r.slug}`}
                    className="search-row"
                    onClick={() => setOpen(false)}
                  >
                    <span className="search-title">{r.title}</span>
                  </Link>
                ))
              ) : (
                <div className="search-empty">No results found</div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
