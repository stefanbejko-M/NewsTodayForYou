import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

type UrlEntry = {
  loc: string
  changefreq?: string
  priority?: number
  lastmod?: string
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
const publicDir = path.join(process.cwd(), 'public')

function toIsoDate(value: string | Date | null | undefined): string {
  if (!value) return new Date().toISOString()
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

function buildUrlEntry({ loc, changefreq, priority, lastmod }: UrlEntry) {
  return [
    '<url>',
    `<loc>${loc}</loc>`,
    lastmod ? `<lastmod>${lastmod}</lastmod>` : '',
    changefreq ? `<changefreq>${changefreq}</changefreq>` : '',
    typeof priority === 'number' ? `<priority>${priority}</priority>` : '',
    '</url>',
  ]
    .filter(Boolean)
    .join('')
}

function wrapUrlset(urls: UrlEntry[]) {
  const body = urls.map(buildUrlEntry).join('')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</urlset>',
  ].join('')
}

function wrapSitemapIndex(sitemaps: string[]) {
  const body = sitemaps
    .map((loc) => `<sitemap><loc>${loc}</loc></sitemap>`)
    .join('')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</sitemapindex>',
  ].join('')
}

async function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[sitemap] Missing Supabase env vars, dynamic URLs will be skipped')
    return null
  }

  return createClient(supabaseUrl, supabaseKey)
}

async function getPosts() {
  const supabase = await getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('post')
    .select('slug, updated_at, created_at')
    .not('slug', 'is', null)

  if (error || !data) {
    console.error('[sitemap] Failed to fetch posts', error)
    return []
  }

  return data
    .filter((post) => post.slug)
    .map((post) => ({
      loc: `${siteUrl}/news/${post.slug}`,
      changefreq: 'daily',
      priority: 0.8,
      lastmod: toIsoDate(post.updated_at ?? post.created_at),
    }))
}

async function getCategories() {
  const supabase = await getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('category')
    .select('slug, created_at')
    .not('slug', 'is', null)

  if (error || !data) {
    console.error('[sitemap] Failed to fetch categories', error)
    return []
  }

  const nowIso = new Date().toISOString()
  return data
    .filter((category) => category.slug)
    .flatMap((category) => {
      const lastmod = toIsoDate(category.created_at)
      const baseEntry = {
        loc: `${siteUrl}/category/${category.slug}`,
        changefreq: 'hourly',
        priority: 0.7,
        lastmod,
      }

      const paginated = Array.from({ length: 4 }, (_, idx) => {
        const page = idx + 2
        return {
          loc: `${baseEntry.loc}?page=${page}`,
          changefreq: 'hourly',
          priority: 0.6,
          lastmod: baseEntry.lastmod,
        }
      })

      return [baseEntry, ...paginated]
    })
}

function getStaticPages(): UrlEntry[] {
  const nowIso = new Date().toISOString()
  const paths = [
    '/',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/cookies',
    '/accessibility',
    '/resources',
    '/featured',
    '/ads',
  ]

  return paths.map((path) => ({
    loc: `${siteUrl}${path}`,
    changefreq: 'daily',
    priority: path === '/' ? 1 : 0.6,
    lastmod: nowIso,
  }))
}

async function writeFile(filename: string, contents: string) {
  const target = path.join(publicDir, filename)
  await fs.writeFile(target, contents)
  console.log(`[sitemap] Wrote ${filename}`)
}

async function main() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()])
  const pages = getStaticPages()

  await fs.mkdir(publicDir, { recursive: true })

  await Promise.all([
    writeFile('post-sitemap.xml', wrapUrlset(posts)),
    writeFile('category-sitemap.xml', wrapUrlset(categories)),
    writeFile('page-sitemap.xml', wrapUrlset(pages)),
  ])

  const sitemapList = [
    `${siteUrl}/post-sitemap.xml`,
    `${siteUrl}/page-sitemap.xml`,
    `${siteUrl}/category-sitemap.xml`,
  ]

  const indexXml = wrapSitemapIndex(sitemapList)
  await Promise.all([
    writeFile('sitemap_index.xml', indexXml),
    writeFile('sitemap.xml', indexXml),
  ])
}

main().catch((error) => {
  console.error('[sitemap] Generation failed', error)
  process.exitCode = 1
})

