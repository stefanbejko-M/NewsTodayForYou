import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 0

type Row = { title: string; slug: string; created_at: string; source_name: string | null }

export default async function Home() {
  let rows: Row[] = []
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      rows = []
    } else {
      const client = createClient(supabaseUrl, supabaseKey)
      
      const { data, error } = await client
        .from('post')
        .select('title, slug, created_at, source_name')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) {
        console.error('Error fetching posts:', error)
        rows = []
      } else {
        rows = data || []
      }
    }
  } catch (err) {
    console.error('Error in Home page:', err)
    rows = []
  }

  return (
    <div>
      <h1>Latest</h1>
      {rows.length === 0 ? (
        <p style={{ color: '#666', padding: '20px 0' }}>
          No articles yet. Check back soon!
        </p>
      ) : (
        <ul>
          {rows.map((p) => (
            <li key={p.slug}>
              <Link href={`/news/${p.slug}`}>{p.title}</Link>{' '}
              <small>({p.source_name ?? 'Original'})</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
