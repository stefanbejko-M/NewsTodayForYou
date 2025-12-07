import OpenAI from 'openai'

export type SocialPostTexts = {
  fbText: string
  igText: string
  threadsText: string
  hashtags: string
}

export type ArticleData = {
  id: number
  slug: string
  title: string
  body: string
  excerpt?: string | null
  imageUrl?: string | null
  category?: string | null
  sourceName?: string | null
  url: string
}

/**
 * Get OpenAI client
 */
function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  })
}

/**
 * Generate Instagram suggested_text for social posts table
 * This generates an English Instagram caption with hashtags (no URL)
 * Targeted for US/CA/UK/AU markets
 */
export async function generateInstagramSuggestedText(
  article: ArticleData
): Promise<string> {
  const openai = getOpenAIClient()

  // Build base hashtags based on category (English)
  const hashtags: string[] = ['#NewsTodayForYou']
  if (article.category) {
    const categoryLower = article.category.toLowerCase()
    const categoryMap: Record<string, string> = {
      sports: '#Sports',
      politics: '#Politics',
      'ai-news': '#AI #TechNews',
      celebrity: '#Celebrity',
      games: '#Gaming',
      'daily-highlights': '#News',
    }
    if (categoryMap[categoryLower]) {
      hashtags.push(categoryMap[categoryLower])
    }
  }

  // Add market-specific hashtags
  hashtags.push('#USA', '#Canada', '#UK', '#Australia')

  const prompt = `You are a professional social media content creator. Generate an engaging Instagram caption in English for a news article.

Article Title: ${article.title}

Article Summary: ${article.excerpt || article.body.slice(0, 500)}

Category: ${article.category || 'general'}

${article.sourceName ? `Source: ${article.sourceName}` : ''}

Requirements:

1. Write a natural Instagram caption in English (2-4 sentences)
2. Make it engaging, easy to read, and suitable for an international audience
3. Write as if speaking to users in the United States, Canada, United Kingdom, and Australia
4. Be visual and emotional in your language
5. DO NOT include the article URL (the backend will add it separately)
6. ALWAYS end with 3-7 relevant English hashtags on a new line
7. Hashtags should be relevant to the article topic and appropriate for US/CA/UK/AU markets
8. Maximum ~600 characters (including hashtags)
9. If the article mentions a specific city or country, you may briefly mention it in the caption

Format:
<main English text>

#hashtag1 #hashtag2 #hashtag3 #hashtag4

Return ONLY the text, no JSON, no markdown, no explanations.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional Instagram content creator writing for an international English-speaking audience (US, Canada, UK, Australia). Always return only the text, no JSON, no markdown, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Clean up the response - remove any markdown formatting
    let suggestedText = content.trim()

    // Remove markdown code blocks if present
    suggestedText = suggestedText.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '')

    // Ensure it ends with hashtags on a new line
    // If it doesn't have hashtags, add some default ones
    if (!suggestedText.includes('#')) {
      const defaultHashtags = hashtags.join(' ')
      suggestedText = `${suggestedText}\n\n${defaultHashtags}`
    }

    // Ensure hashtags are on a new line (if they're not already)
    if (suggestedText.includes('#') && !suggestedText.includes('\n#')) {
      // Find the last hashtag and ensure it's on a new line
      // Updated regex to match English hashtags (alphanumeric and underscore only)
      const hashtagMatch = suggestedText.match(/#[\w]+/g)
      if (hashtagMatch && hashtagMatch.length > 0) {
        const lastHashtagIndex = suggestedText.lastIndexOf(hashtagMatch[hashtagMatch.length - 1])
        const beforeHashtags = suggestedText.substring(0, lastHashtagIndex).trim()
        const hashtagsPart = suggestedText.substring(lastHashtagIndex).trim()
        suggestedText = `${beforeHashtags}\n\n${hashtagsPart}`
      }
    }

    return suggestedText.trim()
  } catch (error) {
    console.error('[INSTAGRAM SUGGESTED TEXT] Error generating text:', error)

    // Fallback: generate simple text manually in English
    const shortSummary = article.excerpt || article.body.slice(0, 150) + '...'
    const fallbackText = `${article.title}\n\n${shortSummary}\n\n${hashtags.join(' ')}`

    return fallbackText
  }
}

/**
 * Generate social media post texts using OpenAI
 * (Legacy function - kept for backward compatibility)
 */
export async function generateSocialPostTexts(
  article: ArticleData
): Promise<SocialPostTexts> {
  const openai = getOpenAIClient()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  const articleUrl = `${baseUrl}/news/${article.slug}`

  // Build hashtags
  const hashtags: string[] = ['#NewsTodayForYou']
  if (article.category) {
    const categoryLower = article.category.toLowerCase()
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
  const hashtagsString = hashtags.join(' ')

  const prompt = `You are a social media content creator. Generate engaging, platform-optimized posts for a news article.

Article Title: ${article.title}

Article Summary: ${article.excerpt || article.body.slice(0, 500)}

Article URL: ${articleUrl}

Category: ${article.category || 'general'}

Requirements:

1. Facebook Post (fbText):
   - 2-3 sentences maximum
   - Engaging hook
   - Include the article URL at the end
   - Professional but friendly tone
   - Max 500 characters

2. Instagram Post (igText):
   - 2-4 sentences
   - More visual/emotional language
   - Include the article URL
   - Can be slightly longer than Facebook
   - Max 600 characters

3. Threads Post (threadsText):
   - 1-2 sentences
   - Concise and punchy
   - Include the article URL
   - Very short, Twitter-like format
   - Max 280 characters

4. Hashtags:
   - Use these hashtags: ${hashtagsString}
   - Add 2-3 relevant additional hashtags if appropriate

Return ONLY valid JSON with this exact structure:
{
  "fbText": "...",
  "igText": "...",
  "threadsText": "...",
  "hashtags": "${hashtagsString} ..."
}

Do NOT include any markdown, code blocks, or explanations. Only the JSON object.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional social media content creator. Always return valid JSON only, no markdown or explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from OpenAI')
    }

    const result: SocialPostTexts = JSON.parse(jsonMatch[0])

    // Validate response
    if (!result.fbText || !result.igText || !result.threadsText || !result.hashtags) {
      throw new Error('Incomplete AI response')
    }

    // Ensure hashtags include the base hashtags
    if (!result.hashtags.includes('#NewsTodayForYou')) {
      result.hashtags = `${hashtagsString} ${result.hashtags}`.trim()
    }

    return result
  } catch (error) {
    console.error('[SOCIAL POST GENERATOR] Error generating texts:', error)

    // Fallback: generate simple texts manually
    const shortSummary = article.excerpt || article.body.slice(0, 150) + '...'
    const fbText = `${article.title}\n\n${shortSummary}\n\nRead more: ${articleUrl}`
    const igText = `${article.title}\n\n${shortSummary}\n\n${articleUrl}`
    const threadsText = `${article.title}\n\n${articleUrl}`

    return {
      fbText,
      igText,
      threadsText,
      hashtags: hashtagsString,
    }
  }
}
