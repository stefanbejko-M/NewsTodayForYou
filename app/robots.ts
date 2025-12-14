// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: [
      `${base}/sitemap.xml`,
      `${base}/sitemap_index.xml`,
      `${base}/post-sitemap.xml`,
      `${base}/page-sitemap.xml`,
      `${base}/category-sitemap.xml`,
      `${base}/news-sitemap.xml`,
    ],
  }
}
