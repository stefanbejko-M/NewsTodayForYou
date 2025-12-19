import OpenAI from 'openai'

/**
 * Input type for article generation
 */
export type AiArticleSource = {
  title: string
  excerpt?: string | null
  body: string
  categorySlug?: string | null
  sourceName: string
  publishedAt?: string | null
  url?: string | null
  imageUrl?: string | null
}

/**
 * Output type for article generation
 */
export type EditorialArticleResult = {
  title: string
  slug: string
  body: string
  excerpt: string
  source_name: string
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
 * Generate slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
}

/**
 * Generate editorial-style article with structured format
 * This creates unique, SEO-friendly content that avoids duplicate content signals
 */
export async function generateEditorialArticle(
  source: AiArticleSource
): Promise<EditorialArticleResult> {
  const openai = getOpenAIClient()

  // Build the prompt with explicit structure requirements
  const prompt = `You are a professional news editor writing for an English-language news site (target audience: US, Canada, UK, Australia).

Rewrite the following news article into a unique, editorial-style article following this EXACT structure:

**STRUCTURE REQUIREMENTS:**

1. **Custom Lead Paragraph** (2-4 sentences):
   - Set context and explain why this story matters
   - Frame the situation with light editorial analysis
   - DO NOT copy any sentence verbatim from the source
   - Paraphrase and restructure completely
   - Use neutral, journalistic tone

2. **Key Points** section:
   - Markdown heading: **Key Points**
   - 3-5 bullet points (-) summarizing essential facts
   - Only include facts actually present in the source
   - DO NOT invent numbers, quotes, dates, or events
   - Focus on: scores, dates, main outcomes, key names/places mentioned

3. **Main Body**:
   - Several paragraphs expanding on the story
   - Use light analysis and connective wording (e.g., "this highlights", "the development comes at a time when...")
   - DO NOT invent specific new facts not in the source
   - Rephrase everything - avoid copying any full sentence
   - Maintain neutral, journalistic tone

4. **Context Block**:
   - Markdown heading: **Context**
   - 1-2 sentences explaining why this story is relevant
   - Use only safe, generic reasoning
   - Examples: "The result adds further pressure on...", "The announcement comes amid broader debates about..."

5. **Background** (optional - only if source has enough info):
   - Markdown heading: **Background**
   - 2-4 sentences of background from source (past results, previous events, long-running disputes)
   - Paraphrased, not copied

6. **Closing sentence**:
   - One sentence wrapping up the article
   - Example: "It remains to be seen how this development will shape the next stages of the season."
   - Generic, forward-looking close

**CRITICAL RULES:**
- Output must be a single markdown string
- DO NOT include boilerplate like "In this article we will..."
- Maintain neutral, journalistic tone throughout
- ABSOLUTELY NO fabrication of concrete facts (no invented scores, quotes, locations, dates, or names)
- Light, generic interpretation is allowed, but NOT new factual claims
- NEVER copy full sentences from original - always paraphrase and reorder
- Avoid speculative or sensational language
- No "clickbait" phrasing
- Write for Google News / rich results compatibility

**EXCERPT REQUIREMENT:**
- Generate a short SEO-friendly excerpt (1-2 sentences, max 150 characters)
- Summarize the article's main point
- Use for meta descriptions

**TITLE REQUIREMENT:**
- Rewrite the title to be SEO-optimized and unique
- Avoid clickbait
- Clear, descriptive, and engaging

**SLUG REQUIREMENT:**
- Generate a URL-friendly slug based on the new title
- Lowercase, hyphens for spaces, no special characters

Original Title: ${source.title}

Original Body/Content: ${source.body.substring(0, 3000)}

${source.excerpt ? `Original Excerpt: ${source.excerpt}` : ''}

Source: ${source.sourceName}

${source.categorySlug ? `Category: ${source.categorySlug}` : ''}

Return ONLY valid JSON with this exact structure:
{
  "new_title": "...",
  "new_slug": "...",
  "new_content": "...",
  "new_excerpt": "...",
  "source_name": "${source.sourceName}"
}

The "new_content" field must contain the full markdown article following the structure above.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional news editor who rewrites articles in clear, engaging English with unique editorial structure. Always return valid JSON only. Never copy sentences verbatim from sources. Always paraphrase and restructure.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500, // Increased for longer editorial articles
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

    const result = JSON.parse(jsonMatch[0])

    // Validate response
    if (!result.new_title || !result.new_slug || !result.new_content) {
      throw new Error('Incomplete AI response')
    }

    // Ensure excerpt exists (generate fallback if missing)
    if (!result.new_excerpt || result.new_excerpt.trim().length === 0) {
      // Generate a simple excerpt from the first sentence of content
      const firstSentence = result.new_content
        .replace(/^#+\s+/gm, '') // Remove markdown headings
        .split(/[.!?]/)[0]
        .trim()
        .substring(0, 150)
      result.new_excerpt = firstSentence || 'Latest news update from NewsTodayForYou.'
    }

    // Ensure slug is valid
    if (!result.new_slug || result.new_slug.trim().length === 0) {
      result.new_slug = generateSlug(result.new_title)
    }

    return {
      title: result.new_title,
      slug: result.new_slug,
      body: result.new_content,
      excerpt: result.new_excerpt.substring(0, 160), // Ensure max 160 chars
      source_name: result.source_name || source.sourceName,
    }
  } catch (error) {
    console.error('[EDITORIAL ARTICLE AI] Error generating article:', error)
    throw error
  }
}

/**
 * Fallback function: Generate a simple paraphrased article if AI fails
 * This ensures the pipeline doesn't break
 */
export function generateFallbackArticle(source: AiArticleSource): EditorialArticleResult {
  // Create a basic structure from the source
  const slug = generateSlug(source.title)
  const excerpt = source.excerpt || source.body.substring(0, 150).replace(/\n/g, ' ') + '...'
  
  // Simple markdown structure
  const body = `${source.title}\n\n${source.body.substring(0, 1000)}...\n\n**Source:** ${source.sourceName}`

  return {
    title: source.title,
    slug,
    body,
    excerpt: excerpt.substring(0, 160),
    source_name: source.sourceName,
  }
}

