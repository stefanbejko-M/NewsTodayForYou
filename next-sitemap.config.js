const { createClient } = require('@supabase/supabase-js')

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'

const sitemapUrls = [
  `${siteUrl}/sitemap.xml`,
  `${siteUrl}/sitemap_index.xml`,
  `${siteUrl}/post-sitemap.xml`,
  `${siteUrl}/page-sitemap.xml`,
  `${siteUrl}/category-sitemap.xml`,
]

async function getAdditionalPaths() {
  const paths = []
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[SITEMAP] Missing Supabase env vars, skipping dynamic URLs')
      return paths
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get all news article slugs
    const { data: posts, error: postsError } = await supabase
      .from('post')
      .select('slug')
      .not('slug', 'is', null)
    
    if (!postsError && posts && Array.isArray(posts)) {
      posts.forEach((post) => {
        if (post.slug) {
          paths.push({
            loc: `/news/${post.slug}`,
            changefreq: 'daily',
            priority: 0.8,
            lastmod: new Date().toISOString(),
          })
        }
      })
    }
    
    // Get all category slugs
    const { data: categories, error: categoriesError } = await supabase
      .from('category')
      .select('slug')
      .not('slug', 'is', null)
    
    if (!categoriesError && categories && Array.isArray(categories)) {
      categories.forEach((category) => {
        if (category.slug) {
          // Add category page (page 1)
          paths.push({
            loc: `/category/${category.slug}`,
            changefreq: 'hourly',
            priority: 0.7,
            lastmod: new Date().toISOString(),
          })
          // Add a few paginated category pages (pages 2-5)
          for (let page = 2; page <= 5; page++) {
            paths.push({
              loc: `/category/${category.slug}?page=${page}`,
              changefreq: 'hourly',
              priority: 0.6,
              lastmod: new Date().toISOString(),
            })
          }
        }
      })
    }
    
    // Add paginated home pages (pages 2-10)
    for (let page = 2; page <= 10; page++) {
      paths.push({
        loc: `/?page=${page}`,
        changefreq: 'hourly',
        priority: 0.7,
        lastmod: new Date().toISOString(),
      })
    }
    
    console.log(`[SITEMAP] Generated ${paths.length} additional paths`)
  } catch (error) {
    console.error('[SITEMAP] Error generating additional paths:', error)
  }
  
  return paths
}

module.exports = {
  siteUrl,
  outDir: 'public',
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: 'hourly',
  priority: 0.9,
  exclude: ['/api/*', '/admin/*'],
  robotsTxtOptions: {
    additionalSitemaps: sitemapUrls,
  },
  additionalPaths: async () => {
    return await getAdditionalPaths()
  },
};
