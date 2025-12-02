const FACEBOOK_API_VERSION = 'v21.0'

export type SocialArticlePayload = {
  id?: number
  slug: string
  title: string
  summary: string
  body?: string
  imageUrl?: string | null
  createdAt?: string | null
  sourceName?: string | null
  category?: string | null
}

/**
 * Build hashtags string from article category
 */
function buildHashtags(payload: SocialArticlePayload): string {
  const hashtags: string[] = ['#NewsTodayForYou']

  if (payload.category) {
    const categoryLower = payload.category.toLowerCase()
    const categoryMap: Record<string, string> = {
      'sports': '#Sports',
      'politics': '#Politics',
      'ai-news': '#AINews',
      'celebrity': '#Celebrity',
      'games': '#Games',
      'daily-highlights': '#DailyHighlights',
    }

    if (categoryMap[categoryLower]) {
      hashtags.push(categoryMap[categoryLower])
    }
  }

  return hashtags.join(' ')
}

/**
 * Ensure imageUrl is a fully qualified URL
 */
function ensureFullImageUrl(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return undefined
  }

  // If already a full URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // If relative, prepend site URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  return new URL(imageUrl, baseUrl).toString()
}

/**
 * @deprecated This function is disabled. Use createSocialPostForArticle from @/lib/socialPostService instead.
 * 
 * Publish a news article to a Facebook page feed using the Graph API.
 * If the Facebook access token is missing, this function logs a warning and exits silently.
 * 
 * NOTE: This function is now disabled and will not post to Facebook.
 */
export async function publishToFacebook(article: SocialArticlePayload): Promise<void> {
  console.warn(
    '[SOCIAL] publishToFacebook is disabled. ' +
    'Auto-posting has been replaced with manual review system. ' +
    'Use createSocialPostForArticle from @/lib/socialPostService instead.'
  )
  return
  const PAGE_ID = process.env.FACEBOOK_PAGE_ID
  const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

  if (!PAGE_ID || !PAGE_TOKEN) {
    console.warn('[FB POST] Skipping: missing FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN')
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  const url = new URL(`/news/${article.slug}`, baseUrl).toString()

  // Compose message: title, summary (max ~200 chars), blank line, read more link, hashtags
  const bodyText = article.body ?? ''
  const safeSummary = article.summary?.trim() || bodyText.slice(0, 200) || ''
  const shortSummary = safeSummary.length > 200 ? safeSummary.slice(0, 197) + '...' : safeSummary
  const hashtags = buildHashtags(article)

  const messageLines = [
    article.title,
    '',
    shortSummary,
    '',
    `Read more: ${url}`,
    '',
    hashtags
  ].filter(Boolean)

  const message = messageLines.join('\n')

  // Ensure imageUrl is a full URL
  const fullImageUrl = ensureFullImageUrl(article.imageUrl)

  // Build request body with picture parameter
  const bodyParams: Record<string, string> = {
    message,
    link: url,
    access_token: PAGE_TOKEN || '',
  }

  if (fullImageUrl) {
    bodyParams.picture = fullImageUrl as string
  }

  const body = new URLSearchParams(bodyParams)

  // Debug logging (only in development or when explicitly enabled)
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_SOCIAL === '1') {
    console.log('[FB POST] Payload', {
      articleId: article.id,
      slug: article.slug,
      hasPicture: !!fullImageUrl,
      pictureUrl: fullImageUrl || 'none',
      messageLength: message.length,
    })
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${FACEBOOK_API_VERSION}/${PAGE_ID}/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      let errorBody: unknown = null
      try {
        errorBody = await response.json()
      } catch {
        errorBody = { message: 'Unable to parse error response' }
      }
      console.error('[FB POST] Error', {
        articleId: article.id,
        slug: article.slug,
        status: response.status,
        body: errorBody,
      })
      return
    }

    const json = await response.json()
    console.log('[FB POST] Success', {
      postId: json.id,
      articleId: article.id,
      slug: article.slug,
    })
  } catch (err: unknown) {
    let errorMsg = 'Unknown error'
    if (err instanceof Error) {
      errorMsg = (err as Error).message
    } else if (typeof err === 'string') {
      errorMsg = err as string
    } else {
      try {
        errorMsg = JSON.stringify(err)
      } catch {
        errorMsg = String(err)
      }
    }
    console.error('[FB POST] Network error', {
      articleId: article.id,
      slug: article.slug,
      error: errorMsg,
    })
  }
}

/**
 * @deprecated This function is disabled. Use createSocialPostForArticle from @/lib/socialPostService instead.
 * 
 * Publish a news article to Instagram using the Content Publishing API.
 * Requires imageUrl to be present. If env vars are missing, logs warning and returns.
 * 
 * NOTE: This function is now disabled and will not post to Instagram.
 */
export async function publishToInstagram(article: SocialArticlePayload): Promise<void> {
  console.warn(
    '[SOCIAL] publishToInstagram is disabled. ' +
    'Auto-posting has been replaced with manual review system. ' +
    'Use createSocialPostForArticle from @/lib/socialPostService instead.'
  )
  return
  const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID
  const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN

  if (!INSTAGRAM_USER_ID || !INSTAGRAM_ACCESS_TOKEN) {
    console.warn('[IG POST] Skipping: missing INSTAGRAM_USER_ID or INSTAGRAM_ACCESS_TOKEN')
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  const url = new URL(`/news/${article.slug}`, baseUrl).toString()

  // Compose caption: title + short summary + URL + hashtags (same format as Facebook)
  const bodyText = article.body ?? ''
  const safeSummary = article.summary?.trim() || bodyText.slice(0, 150) || ''
  const shortSummary = safeSummary.length > 150 ? safeSummary.slice(0, 147) + '...' : safeSummary
  const hashtags = buildHashtags(article)

  const caption = `${article.title}\n\n${shortSummary}\n\n${url}\n\n${hashtags}`

  // Ensure imageUrl is a full URL
  const fullImageUrl = ensureFullImageUrl(article.imageUrl)
  
  if (!fullImageUrl) {
    console.warn('[IG POST] Skipping: no valid imageUrl for article', article.id)
    return
  }

  try {
    // Step 1: Create media container
    const createBody = new URLSearchParams({
      image_url: fullImageUrl || '',
      caption,
      access_token: INSTAGRAM_ACCESS_TOKEN || '',
    })

    const createResponse = await fetch(
      `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${INSTAGRAM_USER_ID}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: createBody.toString(),
      }
    )

    if (!createResponse.ok) {
      let errorBody: unknown = null
      try {
        errorBody = await createResponse.json()
      } catch {
        errorBody = { message: 'Unable to parse error response' }
      }
      console.error('[IG POST] Error creating media container', {
        articleId: article.id,
        slug: article.slug,
        status: createResponse.status,
        body: errorBody,
      })
      return
    }

    const createJson = await createResponse.json()
    const containerId = createJson.id

    if (!containerId) {
      console.error('[IG POST] No container ID returned', {
        articleId: article.id,
        slug: article.slug,
        response: createJson,
      })
      return
    }

    // Step 2: Publish the container
    const publishBody = new URLSearchParams({
      creation_id: containerId || '',
      access_token: INSTAGRAM_ACCESS_TOKEN || '',
    })

    const publishResponse = await fetch(
      `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${INSTAGRAM_USER_ID}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: publishBody.toString(),
      }
    )

    if (!publishResponse.ok) {
      let errorBody: unknown = null
      try {
        errorBody = await publishResponse.json()
      } catch {
        errorBody = { message: 'Unable to parse error response' }
      }
      console.error('[IG POST] Error publishing media', {
        articleId: article.id,
        slug: article.slug,
        status: publishResponse.status,
        body: errorBody,
      })
      return
    }

    const publishJson = await publishResponse.json()
    console.log('[IG POST] Success', {
      postId: publishJson.id,
      articleId: article.id,
      slug: article.slug,
    })
  } catch (error) {
    console.error('[IG POST] Network error', {
      articleId: article.id,
      slug: article.slug,
      error: (() => {
        if (error instanceof Error) return (error as Error).message
        if (typeof error === 'string') return error as string
        try {
          return JSON.stringify(error)
        } catch {
          return String(error)
        }
      })(),
    })
  }
}

/**
 * @deprecated This function is disabled. Use createSocialPostForArticle from @/lib/socialPostService instead.
 * 
 * Publish a news article to Threads.
 * If env vars are missing, logs warning and returns.
 * Note: Threads API endpoint may need verification - implementation is prepared but may need updates.
 * 
 * NOTE: This function is now disabled and will not post to Threads.
 */
export async function publishToThreads(article: SocialArticlePayload): Promise<void> {
  console.warn(
    '[SOCIAL] publishToThreads is disabled. ' +
    'Auto-posting has been replaced with manual review system. ' +
    'Use createSocialPostForArticle from @/lib/socialPostService instead.'
  )
  return
  const THREADS_PROFILE_ID = process.env.THREADS_PROFILE_ID
  const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN

  if (!THREADS_PROFILE_ID || !THREADS_ACCESS_TOKEN) {
    console.warn('[THREADS POST] Skipping: missing THREADS_PROFILE_ID or THREADS_ACCESS_TOKEN')
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  const url = new URL(`/news/${article.slug}`, baseUrl).toString()

  // Compose text: title + very short summary + URL
  const bodyText = article.body ?? ''
  const safeSummary = article.summary?.trim() || bodyText.slice(0, 100) || ''
  const text = `${article.title}\n\n${safeSummary}\n\n${url}`

  try {
    // TODO: Verify exact Threads API endpoint - current implementation uses documented endpoint
    // If endpoint changes, update this accordingly
    const body = new URLSearchParams({
      media_type: 'TEXT',
      text,
      access_token: THREADS_ACCESS_TOKEN || '',
    })

    const response = await fetch(
      `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${THREADS_PROFILE_ID}/threads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    )

    if (!response.ok) {
      let errorBody: unknown = null
      try {
        errorBody = await response.json()
      } catch {
        errorBody = { message: 'Unable to parse error response' }
      }
      console.error('[THREADS POST] Error', {
        articleId: article.id,
        slug: article.slug,
        status: response.status,
        body: errorBody,
      })
      return
    }

    const json = await response.json()
    console.log('[THREADS POST] Success', {
      postId: json.id,
      articleId: article.id,
      slug: article.slug,
    })
  } catch (err: unknown) {
    let errorMsg = 'Unknown error'
    if (err instanceof Error) {
      errorMsg = (err as Error).message
    } else if (typeof err === 'string') {
      errorMsg = err as string
    } else {
      try {
        errorMsg = JSON.stringify(err)
      } catch {
        errorMsg = String(err)
      }
    }
    console.error('[THREADS POST] Network error', {
      articleId: article.id,
      slug: article.slug,
      error: errorMsg,
    })
  }
}

export type SocialPostResult = {
  network: 'facebook' | 'instagram' | 'threads'
  ok: boolean
  status?: string
  error?: string
}

/**
 * @deprecated This function is disabled. Use createSocialPostForArticle from @/lib/socialPostService instead.
 * Auto-posting to social networks has been replaced with a manual review system.
 * 
 * Publish article to all social networks (Facebook, Instagram, Threads).
 * Errors from individual platforms are caught and logged but do not stop other platforms.
 * Returns status for each network.
 * 
 * NOTE: This function is now disabled and will not post to social networks.
 * It only logs a warning and returns empty results.
 */
export async function publishArticleToAllSocial(article: SocialArticlePayload): Promise<SocialPostResult[]> {
  console.warn(
    '[SOCIAL] publishArticleToAllSocial is disabled. ' +
    'Auto-posting has been replaced with manual review system. ' +
    'Use createSocialPostForArticle from @/lib/socialPostService instead.'
  )
  
  // Return empty results - no actual posting
  return []
}

// Legacy function for backward compatibility
export async function publishArticleToFacebook(params: {
  pageId: string
  title: string
  url: string
  summary?: string
}): Promise<void> {
  // Convert old format to new format
  const article: SocialArticlePayload = {
    slug: params.url.split('/').pop() || '',
    title: params.title,
    summary: params.summary || '',
  }
  await publishToFacebook(article)
}

