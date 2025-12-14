import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
const publicDir = path.join(process.cwd(), 'public')

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Convert date to ISO string format required by Google News
 */
function toIsoDate(value: string | Date | null | undefined): string {
  if (!value) return new Date().toISOString()
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

async function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[news-sitemap] Missing Supabase env vars, skipping news sitemap generation')
    return null
  }

  return createClient(supabaseUrl, supabaseKey)
}

async function getRecentNewsPosts() {
  const supabase = await getSupabaseClient()
  if (!supabase) return []

  // Calculate date 48 hours ago
  const fortyEightHoursAgo = new Date()
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48)
  const cutoffDate = fortyEightHoursAgo.toISOString()

  const { data, error } = await supabase
    .from('post')
    .select('slug, title, created_at')
    .eq('is_published', true)
    .gte('created_at', cutoffDate)
    .not('slug', 'is', null)
    .not('title', 'is', null)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('[news-sitemap] Failed to fetch recent posts', error)
    return []
  }

  return data.filter((post) => post.slug && post.title && post.created_at)
}

function buildNewsUrlEntry(post: { slug: string; title: string; created_at: string }) {
  const url = `${siteUrl}/news/${post.slug}`
  const escapedTitle = escapeXml(post.title)
  const publicationDate = toIsoDate(post.created_at)

  // URL should be properly encoded but not XML-escaped (XML parser handles URLs)
  // However, we escape special characters that could break XML structure
  const escapedUrl = url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return [
    '<url>',
    `<loc>${escapedUrl}</loc>`,
    '<news:news>',
    '<news:publication>',
    '<news:name>NewsToday4You</news:name>',
    '<news:language>en</news:language>',
    '</news:publication>',
    `<news:publication_date>${publicationDate}</news:publication_date>`,
    `<news:title>${escapedTitle}</news:title>`,
    '</news:news>',
    '</url>',
  ].join('')
}

function buildNewsSitemap(posts: { slug: string; title: string; created_at: string }[]) {
  const body = posts.map(buildNewsUrlEntry).join('')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    body,
    '</urlset>',
  ].join('')
}

async function main() {
  try {
    const posts = await getRecentNewsPosts()

    if (posts.length === 0) {
      console.log('[news-sitemap] No recent posts found (last 48 hours), generating empty sitemap')
      // Still generate an empty sitemap to avoid 404 errors
      const emptySitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
        '</urlset>',
      ].join('')
      await fs.mkdir(publicDir, { recursive: true })
      await fs.writeFile(path.join(publicDir, 'news-sitemap.xml'), emptySitemap)
      console.log('[news-sitemap] Wrote news-sitemap.xml (empty)')
      return
    }

    const xml = buildNewsSitemap(posts)
    await fs.mkdir(publicDir, { recursive: true })
    await fs.writeFile(path.join(publicDir, 'news-sitemap.xml'), xml)
    console.log(`[news-sitemap] Wrote news-sitemap.xml with ${posts.length} news articles`)
  } catch (error) {
    console.error('[news-sitemap] Generation failed', error)
    process.exitCode = 1
  }
}

main()

