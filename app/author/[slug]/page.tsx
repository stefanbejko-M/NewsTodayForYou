import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PAGE_SIZE = 20

type Author = {
  id: number
  slug: string
  name: string
  bio: string | null
  role: string | null
  avatar_url: string | null
  twitter_url: string | null
  linkedin_url: string | null
}

type AuthorPost = {
  id: number
  title: string
  slug: string
  excerpt: string | null
  image_url: string | null
  created_at: string
  published_at: string | null
  source_name: string | null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data: author } = await client
    .from('author')
    .select('name, bio, role')
    .eq('slug', slug)
    .maybeSingle()

  if (!author) {
    return {
      title: 'Author Not Found — NewsTodayForYou',
    }
  }

  const title = `${author.name}${author.role ? ` — ${author.role}` : ''} — NewsTodayForYou`
  const description = author.bio || `Articles by ${author.name} on NewsTodayForYou`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  const authorUrl = `${siteUrl}/author/${slug}`

  return {
    title,
    description,
    alternates: { canonical: authorUrl },
    openGraph: {
      title,
      description,
      url: authorUrl,
      type: 'profile',
      siteName: 'NewsTodayForYou',
    },
  }
}

export default async function AuthorPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  try {
    const { slug } = await params
    const urlParams = await searchParams
    const page = Math.max(1, parseInt(urlParams.page || '1', 10))
    const offset = (page - 1) * PAGE_SIZE

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch author
    const { data: author, error: authorError } = await client
      .from('author')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (authorError || !author) {
      notFound()
    }

    const authorData = author as Author

    // Fetch author's published posts
    const { data: posts, error: postsError, count } = await client
      .from('post')
      .select('id, title, slug, excerpt, image_url, created_at, published_at, source_name', { count: 'exact' })
      .eq('author_id', authorData.id)
      .eq('is_published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (postsError) {
      console.error('[AUTHOR PAGE] Error fetching posts:', postsError)
    }

    const authorPosts: AuthorPost[] = Array.isArray(posts) ? posts as AuthorPost[] : []

    // Calculate pagination
    const totalPosts = count || 0
    const totalPages = Math.ceil(totalPosts / PAGE_SIZE)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
    const authorUrl = `${siteUrl}/author/${slug}`

    // Build Person JSON-LD schema
    const personSchema: any = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: authorData.name,
      url: authorUrl,
    }

    if (authorData.bio) {
      personSchema.description = authorData.bio
    }

    if (authorData.role) {
      personSchema.jobTitle = authorData.role
    }

    const sameAs: string[] = []
    if (authorData.twitter_url) {
      sameAs.push(authorData.twitter_url)
    }
    if (authorData.linkedin_url) {
      sameAs.push(authorData.linkedin_url)
    }
    if (sameAs.length > 0) {
      personSchema.sameAs = sameAs
    }

    // Build breadcrumb items
    const breadcrumbItems = [
      { label: 'Home', href: '/' },
      { label: authorData.name },
    ]

    return (
      <>
        <Breadcrumbs items={breadcrumbItems} />
        <div className="author-profile">
          <div className="author-header">
            {authorData.avatar_url ? (
              <img 
                src={authorData.avatar_url} 
                alt={authorData.name}
                className="author-avatar-large"
              />
            ) : (
              <div className="author-avatar-placeholder">
                {authorData.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1>{authorData.name}</h1>
              {authorData.role && (
                <p className="author-role">{authorData.role}</p>
              )}
              {authorData.bio && (
                <p className="author-bio">{authorData.bio}</p>
              )}
              <div className="author-social">
                {authorData.twitter_url && (
                  <a href={authorData.twitter_url} target="_blank" rel="noopener noreferrer">
                    Twitter
                  </a>
                )}
                {authorData.linkedin_url && (
                  <a href={authorData.linkedin_url} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          <h2 style={{ marginTop: '48px', marginBottom: '24px' }}>
            Articles by {authorData.name}
          </h2>

          {authorPosts.length === 0 ? (
            <p style={{ color: '#666', padding: '20px 0' }}>
              No articles published yet.
            </p>
          ) : (
            <>
              <ul className="article-list">
                {authorPosts.map((post) => (
                  <li key={post.id} className="article-card">
                    {post.image_url ? (
                      <a className="article-thumb" href={`/news/${post.slug}`}>
                        <img className="article-image" src={post.image_url} alt={post.title || ''} loading="lazy" />
                      </a>
                    ) : null}
                    <div className="article-content">
                      <h3 className="article-title">
                        <Link href={`/news/${post.slug}`}>{post.title}</Link>
                      </h3>
                      {post.source_name && (
                        <div className="article-meta"><small>{post.source_name}</small></div>
                      )}
                      {post.excerpt ? (
                        <p className="article-excerpt">{post.excerpt}</p>
                      ) : null}
                      {(post.published_at || post.created_at) && (
                        <div className="article-meta">
                          <small>
                            {new Date(post.published_at || post.created_at).toLocaleString(undefined, { 
                              dateStyle: 'medium', 
                              timeStyle: 'short' 
                            })}
                          </small>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav style={{ marginTop: '2rem', padding: '1rem 0', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div>
                      {hasPrevPage ? (
                        <a href={page === 2 ? `/author/${slug}` : `/author/${slug}?page=${page - 1}`} 
                           style={{ padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', borderRadius: '6px', textDecoration: 'none', color: '#1f2937' }}>
                          ← Previous
                        </a>
                      ) : (
                        <span style={{ padding: '0.5rem 1rem', color: '#9ca3af' }}>← Previous</span>
                      )}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      Page {page} of {totalPages} ({totalPosts} articles)
                    </div>
                    <div>
                      {hasNextPage ? (
                        <a href={`/author/${slug}?page=${page + 1}`} 
                           style={{ padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', borderRadius: '6px', textDecoration: 'none', color: '#1f2937' }}>
                          Next →
                        </a>
                      ) : (
                        <span style={{ padding: '0.5rem 1rem', color: '#9ca3af' }}>Next →</span>
                      )}
                    </div>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      </>
    )
  } catch (error) {
    console.error('[AUTHOR PAGE] Error:', error)
    notFound()
  }
}

