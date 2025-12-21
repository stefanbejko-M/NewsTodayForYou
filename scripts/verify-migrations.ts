import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[VERIFY] Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyDatabaseState() {
  console.log('[VERIFY] Verifying database migrations...\n')
  
  let allPassed = true
  
  // Check author table structure
  try {
    const { data, error } = await supabase
      .from('author')
      .select('id, slug, name, bio, role, avatar_url, twitter_url, linkedin_url, created_at, updated_at')
      .limit(1)
    
    if (error) {
      console.error('[VERIFY] ✗ Author table check failed:', error.message)
      allPassed = false
    } else {
      console.log('[VERIFY] ✓ Author table exists with all required columns')
      
      // Check for Daniel Bejkovski
      const { data: daniel } = await supabase
        .from('author')
        .select('id, slug, name, role, bio')
        .eq('slug', 'daniel-bejkovski')
        .maybeSingle()
      
      if (daniel) {
        console.log(`[VERIFY] ✓ Daniel Bejkovski author exists`)
        console.log(`         ID: ${daniel.id}, Role: ${daniel.role || 'N/A'}`)
      } else {
        console.warn('[VERIFY] ⚠ Daniel Bejkovski author not found - run add-author-system migration')
        allPassed = false
      }
    }
  } catch (error) {
    console.error('[VERIFY] ✗ Error checking author table:', error)
    allPassed = false
  }
  
  // Check post table columns
  try {
    const { data, error } = await supabase
      .from('post')
      .select('id, author_id, scheduled_for, published_at, is_published')
      .limit(1)
    
    if (error) {
      console.error('[VERIFY] ✗ Post table check failed:', error.message)
      allPassed = false
    } else {
      console.log('[VERIFY] ✓ Post table has all required columns:')
      console.log('         - author_id')
      console.log('         - scheduled_for')
      console.log('         - published_at')
      console.log('         - is_published')
      
      // Check if any posts have author_id
      const { count: postsWithAuthor } = await supabase
        .from('post')
        .select('*', { count: 'exact', head: true })
        .not('author_id', 'is', null)
      
      console.log(`[VERIFY] ✓ Posts with author_id: ${postsWithAuthor || 0}`)
    }
  } catch (error) {
    console.error('[VERIFY] ✗ Error checking post table:', error)
    allPassed = false
  }
  
  // Check finance category
  try {
    const { data: financeCategory } = await supabase
      .from('category')
      .select('id, slug, name')
      .eq('slug', 'finance')
      .maybeSingle()
    
    if (financeCategory) {
      console.log(`[VERIFY] ✓ Finance category exists (ID: ${financeCategory.id}, Name: ${financeCategory.name})`)
    } else {
      console.warn('[VERIFY] ⚠ Finance category not found - run add-finance-category migration')
      allPassed = false
    }
  } catch (error) {
    console.error('[VERIFY] ✗ Error checking finance category:', error)
    allPassed = false
  }
  
  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('[VERIFY] ✓ All migrations verified successfully!')
    process.exit(0)
  } else {
    console.log('[VERIFY] ✗ Some migrations are missing or incomplete')
    console.log('[VERIFY] Please apply the missing migrations via Supabase Dashboard SQL Editor')
    process.exit(1)
  }
}

verifyDatabaseState().catch((error) => {
  console.error('[VERIFY] Fatal error:', error)
  process.exit(1)
})

