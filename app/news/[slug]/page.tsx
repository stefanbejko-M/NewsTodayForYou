import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'

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
  image_url?: string | null
  // Supabase nested relation may return object or array; use runtime guard
  category?: any
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data } = await client
    .from('post')
    .select('title, excerpt, body, image_url')
    .eq('slug', params.slug)
    .maybeSingle()

  const title = data?.title ?? 'NewsTodayForYou'
  
  // Get description: prefer excerpt, otherwise first 150 chars of body
  let description = 'Latest article on NewsTodayForYou'
  if (data?.excerpt) {
    description = data.excerpt.trim().slice(0, 150)
  } else if (data?.body) {
    description = data.body.trim().slice(0, 150)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  const articleUrl = `${siteUrl}/news/${params.slug}`
  const images = data?.image_url ? [data.image_url] : []

  return {
    title,
    description,
    alternates: { canonical: `/news/${params.slug}` },
    openGraph: {
      title,
      description,
      url: articleUrl,
      type: 'article',
      images: images.length > 0 ? images : undefined,
      siteName: 'NewsTodayForYou',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.length > 0 ? images : undefined,
    },
  }
}

export default async function NewsDetail({ params }: { params: { slug: string } }) {
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('[NEWS DEBUG] slug param =', params.slug)

    const { data, error } = await client
      .from('post')
      .select('*')
      .eq('slug', params.slug)
      .maybeSingle()

    console.log('[NEWS DEBUG] raw data =', data, 'error =', error)

    if (error) {
      console.error('[NEWS PAGE ERROR]', error)
      return <div>Failed to load article.</div>
    }
    if (!data) {
      return <div>Article not found</div>
    }
    const post = data as Post

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
    const cat = Array.isArray((post as any).category) ? (post as any).category[0] : (post as any).category

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
    const articleUrl = `${siteUrl}/news/${post.slug}`
    const publishedDate = post.created_at || new Date().toISOString()
    const modifiedDate = (post as any).updated_at || post.created_at || new Date().toISOString()

    return (
      <>
        <article>
          <h1>{post.title}</h1>
          {cat && cat?.slug && cat?.name ? (
            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '12px' }}>
              <span>Category: </span>
              <Link href={`/category/${cat.slug}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                {cat.name}
              </Link>
            </div>
          ) : null}
          <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
            <span>By NewsTodayForYou Staff</span>
          </div>
          {post.image_url ? (
            <img 
              src={post.image_url} 
              alt={post.title || 'News article image'} 
            />
          ) : null}
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '32px' }}>
            <em>{new Date(post.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</em>
            {post.source_name && (
              <span style={{ marginLeft: '12px' }}>• {post.source_name}</span>
            )}
          </p>
          <div dangerouslySetInnerHTML={{ __html: formattedBody }} />
          <div style={{ marginTop: 48, marginBottom: 32 }}>
            <div id="ad-in-1" style={{ minHeight: '250px', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px' }} />
          </div>
        </article>
        <Script id={`news-article-jsonld-${post.slug}`} type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: post.title || 'News article',
            description: post.excerpt || (typeof post.body === 'string' ? post.body.slice(0, 160) : ''),
            image: post.image_url ? [post.image_url] : [],
            datePublished: publishedDate,
            dateModified: modifiedDate,
            author: {
              '@type': 'Organization',
              name: 'NewsTodayForYou',
            },
            publisher: {
              '@type': 'Organization',
              name: 'NewsTodayForYou',
              logo: {
                '@type': 'ImageObject',
                url: `${siteUrl}/android-chrome-192x192.png`,
              },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': articleUrl,
            },
          })}
        </Script>
      </>
    )
  } catch (error) {
    return <div>Article not found</div>
  }
}
