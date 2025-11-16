import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local and .env
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('[DEBUG ENV] URL present?', !!url, 'ANON?', !!anon, 'SERVICE?', !!service)

  if (!url) {
    console.log('[DEBUG ENV] Missing NEXT_PUBLIC_SUPABASE_URL')
    return
  }

  // Use service role key if anon key is missing (for debugging)
  const key = anon || service
  if (!key) {
    console.log('[DEBUG ENV] Missing both NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY')
    return
  }

  console.log('[DEBUG ENV] Using key type:', anon ? 'ANON' : 'SERVICE_ROLE')

  const client = createClient(url, key)

  try {
    const { data, error } = await client
      .from('post')
      .select('*')
      .limit(5)

    console.log('[DEBUG QUERY RESULT] error =', error)
    if (data && data.length > 0) {
      console.log('[DEBUG POST SAMPLE COUNT]', data.length)
      const sample = data[0] as any
      console.log('[DEBUG POST SAMPLE KEYS]', Object.keys(sample || {}))
      console.log('[DEBUG POST SAMPLE ROW]', JSON.stringify(sample, null, 2))
    } else {
      console.log('[DEBUG POST SAMPLE] No rows returned from post table')
    }
  } catch (e) {
    console.error('[DEBUG QUERY EXCEPTION]', e)
  }
}

main().catch((e) => {
  console.error('[DEBUG MAIN ERROR]', e)
})

