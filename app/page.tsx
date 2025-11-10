import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 0

type Row = { title: string; slug: string; created_at: string; source_name: string | null }

export default async function Home() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data: rows } = await client
    .from('post')
    .select('title, slug, created_at, source_name')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div>
      <h1>Latest</h1>
      <ul>
        {(rows || []).map((p) => (
          <li key={p.slug}>
            <Link href={`/news/${p.slug}`}>{p.title}</Link>{' '}
            <small>({p.source_name ?? 'Original'})</small>
          </li>
        ))}
      </ul>
    </div>
  )
}
