import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
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

  const title = data?.title ? `${data.title} - NewsTodayForYou` : 'NewsTodayForYou'
  
  // Helper: strip markdown for description
  const stripMarkdown = (text: string | null | undefined): string => {
    if (!text) return ''
    return text
      .replace(/^##\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .trim()
  }
  
  // Get description: prefer excerpt, otherwise first 160 chars of body (strip markdown)
  let description = 'Latest article on NewsTodayForYou'
  if (data?.excerpt) {
    description = stripMarkdown(data.excerpt).slice(0, 160)
  } else if (data?.body) {
    description = stripMarkdown(data.body).slice(0, 160)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  const articleUrl = `${siteUrl}/news/${params.slug}`
  const images = data?.image_url && data.image_url.trim() ? [data.image_url] : ['/android-chrome-512x512.png']

  return {
    title,
    description,
    alternates: { canonical: `/news/${params.slug}` },
    openGraph: {
      title,
      description,
      url: articleUrl,
      type: 'article',
      images: images,
      siteName: 'NewsTodayForYou',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: data?.image_url || '/android-chrome-512x512.png',
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

    // Helper: strip markdown for description
    const stripMarkdown = (text: string | null | undefined): string => {
      if (!text) return ''
      return text
        .replace(/^##\s+/gm, '') // Remove markdown headings
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.+?)\*/g, '$1') // Remove italic
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
        .trim()
    }

    // Build NewsArticle JSON-LD schema
    const newsArticleSchema = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: post.title || 'News article',
      description: post.excerpt
        ? stripMarkdown(post.excerpt).slice(0, 160)
        : stripMarkdown(post.body).slice(0, 160) || 'Latest news article from NewsTodayForYou',
      datePublished: publishedDate,
      dateModified: modifiedDate,
      author: {
        '@type': 'Organization',
        name: 'NewsTodayForYou Editorial Team',
      },
      publisher: {
        '@type': 'NewsMediaOrganization',
        name: 'NewsTodayForYou',
        logo: {
          '@type': 'ImageObject',
          url: 'https://newstoday4u.com/logo-nt.svg',
        },
      },
      image: post.image_url && post.image_url.trim()
        ? [post.image_url]
        : ['https://newstoday4u.com/android-chrome-512x512.png'],
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': articleUrl,
      },
    }

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
              loading="lazy"
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
          <div className="author-box">
            <img src="/logo-nt.svg" alt="Author" className="author-avatar" />
            <div>
              <strong>NewsTodayForYou Editorial Team</strong>
              <p>Our editorial team curates and refreshes news every few hours using trusted global sources.</p>
            </div>
          </div>
          <div style={{ marginTop: 48, marginBottom: 32 }}>
            <div id="ad-in-1" style={{ minHeight: '250px', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px' }} />
          </div>
        </article>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
        />
      </>
    )
  } catch (error) {
    return <div>Article not found</div>
  }
}
