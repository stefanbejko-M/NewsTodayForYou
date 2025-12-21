import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SocialShare } from '@/components/SocialShare'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Author = {
  id: number
  slug: string
  name: string
  bio: string | null
  role: string | null
  avatar_url: string | null
}

type Post = {
  id: number
  title: string
  slug: string
  body: string
  excerpt?: string
  created_at: string
  published_at?: string | null
  source_name: string | null
  views?: number | null
  image_url?: string | null
  category_id?: number | null
  author_id?: number | null
  // Supabase nested relation may return object or array; use runtime guard
  category?: any
  author?: Author | Author[] | null
}

type RelatedPost = {
  id: number
  title: string
  slug: string
  image_url?: string | null
  source_name: string | null
  created_at: string
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data } = await client
    .from('post')
    .select('title, excerpt, body, image_url')
    .eq('slug', slug)
    .eq('is_published', true)
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

  // Use SITE_URL first, fallback to NEXT_PUBLIC_SITE_URL, then default
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  const articleUrl = `${siteUrl}/news/${slug}`
  const images = data?.image_url && data.image_url.trim() ? [data.image_url] : ['/android-chrome-512x512.png']

  return {
    title,
    description,
    alternates: { canonical: articleUrl },
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
      images: images,
    },
  }
}

export default async function NewsDetail({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('[NEWS DEBUG] slug param =', slug)

    const { data, error } = await client
      .from('post')
      .select('*, category:category_id(*), author:author_id(*)')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()

    console.log('[NEWS DEBUG] raw data =', data, 'error =', error)

    if (error) {
      console.error('[NEWS PAGE ERROR]', error)
      notFound()
    }
    if (!data) {
      notFound()
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
    const author = Array.isArray((post as any).author) ? (post as any).author[0] : (post as any).author

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
    const articleUrl = `${siteUrl}/news/${post.slug}`
    const publishedDate = post.published_at || post.created_at || new Date().toISOString()
    const modifiedDate = (post as any).updated_at || post.published_at || post.created_at || new Date().toISOString()

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

    // Build NewsArticle JSON-LD schema (clean undefined values)
    // Follows Google's NewsArticle guidelines: https://developers.google.com/search/docs/appearance/structured-data/article
    const newsArticleSchema: any = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': articleUrl,
      },
      headline: (post.title || 'News article').slice(0, 110), // Max ~110 chars for headline
      datePublished: publishedDate,
      dateModified: modifiedDate,
      author: author && typeof author === 'object' && 'name' in author ? {
        '@type': 'Person',
        name: author.name,
        url: author.slug ? `${siteUrl}/author/${author.slug}` : undefined,
      } : {
        '@type': 'Organization',
        name: 'News Today For You',
      },
      publisher: {
        '@type': 'NewsMediaOrganization',
        name: 'News Today For You',
        logo: {
          '@type': 'ImageObject',
          url: 'https://newstoday4u.com/android-chrome-512x512.png', // Use actual logo URL
        },
      },
      isAccessibleForFree: true,
      inLanguage: 'en',
    }

    // Add description if available (strip HTML/markdown, max length)
    const description = post.excerpt
      ? stripMarkdown(post.excerpt).slice(0, 160)
      : stripMarkdown(post.body).slice(0, 160)
    if (description) {
      newsArticleSchema.description = description
    }

    // Add image if available
    if (post.image_url && post.image_url.trim()) {
      newsArticleSchema.image = [post.image_url]
    } else {
      newsArticleSchema.image = ['https://newstoday4u.com/android-chrome-512x512.png']
    }

    // Add articleSection (category)
    if (cat && cat?.name) {
      newsArticleSchema.articleSection = cat.name
    } else if (cat && cat?.slug) {
      // Fallback to slug if name not available
      newsArticleSchema.articleSection = cat.slug
    }

    // Add separate Person schema for author if available
    let personSchema: any = null
    if (author && typeof author === 'object' && 'name' in author) {
      personSchema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: author.name,
      }
      if (author.slug) {
        personSchema.url = `${siteUrl}/author/${author.slug}`
      }
      if (author.bio) {
        personSchema.description = author.bio
      }
      if (author.role) {
        personSchema.jobTitle = author.role
      }
    }

    // Fetch related posts from the same category
    let relatedPosts: RelatedPost[] = []
    if (post.category_id) {
      try {
        const { data: relatedData } = await client
          .from('post')
          .select('id, title, slug, image_url, source_name, created_at')
          .eq('category_id', post.category_id)
          .eq('is_published', true)
          .neq('id', post.id)
          .order('created_at', { ascending: false })
          .limit(6)
        
        if (relatedData && Array.isArray(relatedData)) {
          relatedPosts = relatedData as RelatedPost[]
        }
      } catch (e) {
        console.error('Failed to fetch related posts:', e)
        // Continue without related posts if fetch fails
      }
    }

    // Build breadcrumb items
    const breadcrumbItems = []
    breadcrumbItems.push({ label: 'Home', href: '/' })
    
    if (cat && cat?.slug && cat?.name) {
      breadcrumbItems.push({ label: cat.name, href: `/category/${cat.slug}` })
    }
    
    breadcrumbItems.push({ label: post.title })

    // Build BreadcrumbList JSON-LD
    const breadcrumbListSchema: any = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map((item, index) => {
        const listItem: any = {
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
        }
        if (item.href) {
          listItem.item = `${siteUrl}${item.href}`
        }
        return listItem
      }),
    }

    return (
      <>
        <article>
          <Breadcrumbs items={breadcrumbItems} />
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
            <span>By </span>
            {author && typeof author === 'object' && 'slug' in author && 'name' in author ? (
              <Link href={`/author/${author.slug}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                {author.name}
              </Link>
            ) : (
              <span>NewsTodayForYou Staff</span>
            )}
            {author && typeof author === 'object' && 'role' in author && author.role && (
              <span style={{ marginLeft: '8px', color: '#9ca3af' }}>— {author.role}</span>
            )}
          </div>
          {post.image_url ? (
            <img 
              src={post.image_url} 
              alt={post.title || 'News article image'}
              loading="lazy"
            />
          ) : null}
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '32px' }}>
            <em>{new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</em>
            {post.source_name && (
              <span style={{ marginLeft: '12px' }}>• {post.source_name}</span>
            )}
          </p>
          <div dangerouslySetInnerHTML={{ __html: formattedBody }} />
          {author && typeof author === 'object' && 'name' in author ? (
            <div className="author-box">
              {author.avatar_url ? (
                <img src={author.avatar_url} alt={author.name} className="author-avatar" />
              ) : (
                <img src="/logo-nt.svg" alt={author.name} className="author-avatar" />
              )}
              <div>
                <strong>
                  {author.slug ? (
                    <Link href={`/author/${author.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {author.name}
                    </Link>
                  ) : (
                    author.name
                  )}
                </strong>
                {author.role && <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '14px' }}>{author.role}</p>}
                {author.bio ? (
                  <p>{author.bio}</p>
                ) : (
                  <p>Our editorial team curates and refreshes news every few hours using trusted global sources.</p>
                )}
                {author.slug && (
                  <p style={{ marginTop: '8px' }}>
                    <Link href={`/author/${author.slug}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: '14px' }}>
                      View all articles by {author.name} →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="author-box">
              <img src="/logo-nt.svg" alt="Author" className="author-avatar" />
              <div>
                <strong>NewsTodayForYou Editorial Team</strong>
                <p>Our editorial team curates and refreshes news every few hours using trusted global sources.</p>
              </div>
            </div>
          )}
          <div style={{ marginTop: 48, marginBottom: 32 }}>
            <div id="ad-in-1" style={{ minHeight: '250px', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px' }} />
          </div>
          <SocialShare title={post.title} />
        </article>

        {relatedPosts.length > 0 && (
          <section className="related-stories">
            <h2>Related stories</h2>
            <div className="related-grid">
              {relatedPosts.map((item) => (
                <Link key={item.id} href={`/news/${item.slug}`} className="related-card">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.title} className="related-image" />
                  )}
                  <h3>{item.title}</h3>
                  <p className="related-meta">
                    {item.source_name || 'NewsTodayForYou'} · {new Date(item.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
        />
        {personSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListSchema) }}
        />
      </>
    )
  } catch (error) {
    console.error('[NEWS PAGE ERROR]', error)
    notFound()
  }
}
