import { createClient } from '@supabase/supabase-js'
import { generateSocialPostTexts, type ArticleData, type SocialPostTexts } from './socialPostGenerator'
import { sendSocialPostEmailNotification } from './emailService'

export type SocialPost = {
  id: string
  article_id: number
  slug: string
  title: string
  url: string
  fb_text: string
  ig_text: string
  threads_text: string
  hashtags: string
  image_url: string | null
  fb_posted: boolean
  ig_posted: boolean
  threads_posted: boolean
  created_at: string
  updated_at: string
}

/**
 * Get Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Ensure imageUrl is a fully qualified URL
 */
function ensureFullImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null
  }

  // If already a full URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // If relative, prepend site URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  try {
    return new URL(imageUrl, baseUrl).toString()
  } catch {
    return null
  }
}

/**
 * Create or retrieve social post for an article
 */
export async function createSocialPostForArticle(
  article: ArticleData
): Promise<SocialPost> {
  const supabase = getSupabaseClient()

  // Check if social post already exists for this article
  const { data: existing } = await supabase
    .from('social_post')
    .select('*')
    .eq('article_id', article.id)
    .maybeSingle()

  if (existing) {
    console.log('[SOCIAL POST] Found existing post for article:', article.id)
    return existing as SocialPost
  }

  // Generate social post texts
  console.log('[SOCIAL POST] Generating texts for article:', article.id)
  const texts = await generateSocialPostTexts(article)

  // Determine image URL
  const imageUrl = ensureFullImageUrl(article.imageUrl) || null

  // Build full article URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  const articleUrl = `${baseUrl}/news/${article.slug}`

  // Insert new social post
  const { data: newPost, error } = await supabase
    .from('social_post')
    .insert({
      article_id: article.id,
      slug: article.slug,
      title: article.title,
      url: articleUrl,
      fb_text: texts.fbText,
      ig_text: texts.igText,
      threads_text: texts.threadsText,
      hashtags: texts.hashtags,
      image_url: imageUrl,
      fb_posted: false,
      ig_posted: false,
      threads_posted: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[SOCIAL POST] Error creating post:', error)
    throw new Error(`Failed to create social post: ${error.message}`)
  }

  console.log('[SOCIAL POST] Created new post:', newPost.id)

  // Send email notification (only for new posts)
  try {
    await sendSocialPostEmailNotification(newPost as SocialPost)
  } catch (emailError) {
    // Don't fail the whole operation if email fails
    console.error('[SOCIAL POST] Email notification failed:', emailError)
  }

  return newPost as SocialPost
}

/**
 * Get social post by article ID
 */
export async function getSocialPostByArticleId(
  articleId: number
): Promise<SocialPost | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('social_post')
    .select('*')
    .eq('article_id', articleId)
    .maybeSingle()

  if (error) {
    console.error('[SOCIAL POST] Error fetching post:', error)
    return null
  }

  return data as SocialPost | null
}

/**
 * Get social post by ID
 */
export async function getSocialPostById(id: string): Promise<SocialPost | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('social_post')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[SOCIAL POST] Error fetching post:', error)
    return null
  }

  return data as SocialPost | null
}

/**
 * Update social post
 */
export async function updateSocialPost(
  id: string,
  updates: {
    fb_posted?: boolean
    ig_posted?: boolean
    threads_posted?: boolean
    fb_text?: string
    ig_text?: string
    threads_text?: string
    hashtags?: string
  }
): Promise<SocialPost | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('social_post')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[SOCIAL POST] Error updating post:', error)
    return null
  }

  return data as SocialPost | null
}

/**
 * List social posts with optional filters
 */
export async function listSocialPosts(options: {
  status?: 'all' | 'unposted'
  limit?: number
  offset?: number
}): Promise<SocialPost[]> {
  const supabase = getSupabaseClient()

  let query = supabase.from('social_post').select('*')

  // Filter by posted status
  if (options.status === 'unposted') {
    query = query.or('fb_posted.eq.false,ig_posted.eq.false,threads_posted.eq.false')
  }

  // Order by created_at DESC
  query = query.order('created_at', { ascending: false })

  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit)
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('[SOCIAL POST] Error listing posts:', error)
    return []
  }

  return (data || []) as SocialPost[]
}

