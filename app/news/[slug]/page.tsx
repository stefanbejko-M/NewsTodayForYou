import { createClient } from '@supabase/supabase-js'

export const revalidate = 0

type Post = {
  id: number
  title: string
  slug: string
  body: string
  excerpt?: string
  created_at: string
  source_name: string | null
  views?: number | null
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data } = await client
    .from('post')
    .select('title, excerpt, body')
    .eq('slug', params.slug)
    .maybeSingle()

  const title = data?.title ?? 'Article'
  
  // Safely get description: use excerpt if available, otherwise fall back to body
  const excerptOrBody = data?.excerpt || data?.body || ''
  const description = excerptOrBody ? excerptOrBody.slice(0, 160) : 'Latest article on NewsTodayForYou'

  return {
    title,
    description,
    alternates: { canonical: `/news/${params.slug}` },
    openGraph: {
      title,
      description,
      url: `/news/${params.slug}`,
      type: 'article'
    }
  }
}

export default async function NewsDetail({ params }: { params: { slug: string } }) {
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: post, error } = await client
      .from('post')
      .select('id, title, slug, body, excerpt, created_at, source_name, views')
      .eq('slug', params.slug)
      .maybeSingle()

    if (error || !post) {
      return <div>Article not found</div>
    }

    // Increment views (non-blocking, best-effort)
    try {
      const currentViews = typeof post.views === 'number' ? post.views : 0
      await client
        .from('post')
        .update({ views: currentViews + 1 })
        .eq('id', post.id)
    } catch (e) {
      // Do not block rendering if increment fails
      console.error('Failed to increment views', e)
    }

    // Convert markdown headings to HTML
    const formatContent = (content: string | null | undefined) => {
      if (!content) return ''
      return content
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/\n\n/g, '</p><p>')
    }

    const bodyContent = post.body || ''
    const formattedBody = `<p>${formatContent(bodyContent)}</p>`

    return (
      <article>
        <h1>{post.title}</h1>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
          <em>{new Date(post.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</em>
        </p>
        <div dangerouslySetInnerHTML={{ __html: formattedBody }} />
        <div style={{ marginTop: 24 }}>
          <div id="ad-in-1" />
        </div>
        {post.source_name && (
          <div style={{
            fontSize: '11px',
            opacity: 0.45,
            marginTop: '28px'
          }}>
            Source: {post.source_name}
          </div>
        )}
      </article>
    )
  } catch (error) {
    return <div>Article not found</div>
  }
}
