'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Header() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ title: string; slug: string }[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  // авто-пребарување со debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return }
      const { data } = await client
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
    <header className="header">
      <div className="brand">
        <img src="/logo.svg" alt="logo" />
        <span>NewsTodayForYou</span>
      </div>

      <nav className="nav">
        <Link href="/">Home</Link>
        <span role="button" tabIndex={0} onClick={() => setOpen((v) => !v)}>Search</span>
        <Link href="/featured">Featured</Link>
      </nav>

      {open && (
        <div className="search-panel" ref={panelRef}>
          <input
            className="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type to search… e.g. Trump"
            autoFocus
          />
          <div className="search-results">
            {q && results.length === 0 && (
              <div className="search-empty">No results for “{q}”.</div>
            )}
            {results.map((p) => (
              <Link key={p.slug} href={`/news/${p.slug}`} className="search-row" onClick={() => setOpen(false)}>
                <div className="search-title">{p.title}</div>
                <div className="search-meta">Open</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
