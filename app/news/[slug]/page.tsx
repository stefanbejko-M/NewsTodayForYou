import { createClient } from '@supabase/supabase-js'

export const revalidate = 0

type Post = {
  title: string
  slug: string
  body: string
  excerpt?: string
  created_at: string
  source_name: string | null
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data } = await client
    .from('post')
    .select('title, excerpt')
    .eq('slug', params.slug)
    .maybeSingle()

  const title = data?.title ?? 'Article'
  const description = (data?.excerpt ?? '').slice(0, 160) || 'Latest article on NewsTodayForYou'

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
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data: post } = await client
    .from('post')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!post) return <div>Article not found</div>

  return (
    <article>
      <h1>{post.title}</h1>
      <p>
        <em>{new Date(post.created_at).toLocaleString()}</em> —{' '}
        <strong>{post.source_name || 'NewsTodayForYou'}</strong>
      </p>
      <div dangerouslySetInnerHTML={{ __html: post.body }} />
      <div style={{ marginTop: 24 }}>
        <div id="ad-in-1" />
      </div>
    </article>
  )
}
