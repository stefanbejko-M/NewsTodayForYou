import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

async function insertTestSocialPost() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL')
    console.error('Required: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Test data - using the structure from socialPostService.ts
  // The service uses 'social_post' but the actual table is 'social_posts'
  // Based on the service, the table should have these columns
  const testData = {
    article_id: 999, // Test article ID
    slug: 'test-instagram-post',
    title: 'Test Instagram Post',
    url: 'https://newstoday4u.com',
    fb_text: '',
    ig_text: 'Test Instagram auto-publish from NewsToday4U',
    threads_text: '',
    hashtags: '#Test #NewsToday4U',
    image_url: 'https://picsum.photos/800/800',
    fb_posted: false,
    ig_posted: false,
    threads_posted: false,
  }

  console.log('📝 Inserting test row into social_post table...')
  console.log('Data:', JSON.stringify(testData, null, 2))

  try {
    // The service uses 'social_post' but actual table is 'social_posts'
    // Try social_posts first since that's what exists
    const { data, error } = await supabase
      .from('social_posts')
      .insert([testData])
      .select()

    if (error) {
      console.error('❌ Insert failed:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // If column doesn't exist, try with migration schema
      if (error.code === '42703' || error.message.includes('column')) {
        console.log('\n⚠️  Trying with migration schema (social_posts with different columns)...')
        const migrationData = {
          title: testData.title,
          url: testData.url,
          image_url: testData.image_url,
          platform: 'instagram',
          status: 'pending',
          suggested_text: testData.ig_text,
        }

        const { data: data2, error: error2 } = await supabase
          .from('social_posts')
          .insert([migrationData])
          .select()

        if (error2) {
          console.error('❌ Insert with migration schema also failed:', error2)
          process.exit(1)
        }

        console.log('✅ Insert succeeded into social_posts table (migration schema)!')
        console.log('Inserted row:', JSON.stringify(data2, null, 2))
        return
      }
      
      process.exit(1)
    }

    console.log('✅ Insert succeeded into social_posts table!')
    console.log('Inserted row:', JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

insertTestSocialPost()

