import { createClient } from '@supabase/supabase-js'

/**
 * Social post type matching the actual database schema
 */
export type SocialPost = {
  id: string
  title: string
  url: string
  image_url: string | null
  platform: 'instagram' | 'facebook' | 'threads' | string
  status: 'pending' | 'published' | 'failed' | string
  suggested_text: string | null
  created_at: string
  updated_at: string
  instagram_post_id?: string | null
  instagram_permalink?: string | null
  published_at?: string | null
  last_error?: string | null
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
 * Get social post by ID
 */
export async function getSocialPostById(id: string): Promise<SocialPost | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('social_posts')
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
    status?: string
    suggested_text?: string
    title?: string
    url?: string
    image_url?: string | null
    platform?: string
    instagram_post_id?: string | null
    instagram_permalink?: string | null
    published_at?: string | null
    last_error?: string | null
  }
): Promise<SocialPost | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('social_posts')
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

  let query = supabase.from('social_posts').select('*')

  // Filter by status: "unposted" means status !== "published"
  if (options.status === 'unposted') {
    query = query.neq('status', 'published')
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
