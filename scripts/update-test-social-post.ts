import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

async function updateTestSocialPost() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL')
    console.error('Required: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const newImageUrl = 'https://images.pexels.com/photos/2695023/pexels-photo-2695023.jpeg'
  const titleToFind = 'Test Instagram Post'

  console.log('📝 Updating test row in social_posts table...')
  console.log(`Looking for post with title: "${titleToFind}"`)
  console.log(`New image_url: ${newImageUrl}`)

  try {
    // First, find the post
    const { data: existingPost, error: findError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('title', titleToFind)
      .maybeSingle()

    if (findError) {
      console.error('❌ Error finding post:', findError)
      process.exit(1)
    }

    if (!existingPost) {
      console.error(`❌ Post with title "${titleToFind}" not found`)
      process.exit(1)
    }

    console.log('✅ Found post:', {
      id: existingPost.id,
      title: existingPost.title,
      current_image_url: existingPost.image_url,
    })

    // Update the image_url
    const { data: updatedPost, error: updateError } = await supabase
      .from('social_posts')
      .update({ image_url: newImageUrl })
      .eq('id', existingPost.id)
      .select()

    if (updateError) {
      console.error('❌ Update failed:', updateError)
      process.exit(1)
    }

    if (!updatedPost || updatedPost.length === 0) {
      console.error('❌ Update succeeded but no data returned')
      process.exit(1)
    }

    console.log('✅ Update succeeded!')
    console.log('Updated row:', JSON.stringify(updatedPost[0], null, 2))
    console.log(`\n✅ Confirmed: image_url updated to: ${updatedPost[0].image_url}`)
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

updateTestSocialPost()

