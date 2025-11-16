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
  image_url?: string | null
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[PAGE ERROR] Missing Supabase environment variables')
      return <div>Failed to load posts.</div>
    }

    const client = createClient(supabaseUrl, supabaseKey)
    
    // First, get the category ID from the slug
    const { data: categoryData, error: categoryError } = await client
      .from('category')
      .select('id, slug, name')
      .eq('slug', params.slug)
      .maybeSingle()
    
    if (categoryError) {
      let errorMsg = 'Unknown error'
      try {
        errorMsg = categoryError instanceof Error ? categoryError.message : JSON.stringify(categoryError)
      } catch {
        errorMsg = String(categoryError)
      }
      console.error('[PAGE ERROR]', errorMsg)
      return <div>Failed to load posts.</div>
    }

    if (!categoryData || !categoryData.id) {
      return <div>Category not found.</div>
    }

    // Fetch posts for this category - ONLY posts with matching category_id
  const { data, error } = await client
      .from('post')
      .select('title, slug, created_at, source_name, body, excerpt, image_url')
      .eq('category_id', categoryData.id)
      .order('created_at', { ascending: false })
      .limit(30)
    
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

    const categoryName = categoryData.name || params.slug

    return (
      <div>
        <h1>{categoryName}</h1>
        {validPosts.length === 0 ? (
          <p style={{ color: '#666', padding: '20px 0' }}>
            No articles in this category yet. Check back soon!
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

