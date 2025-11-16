import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const env = {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseKey
  }

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({
      env,
      supabase: {
        error: 'missing env vars',
        rowCount: 0,
        sampleKeys: []
      }
    })
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await client
      .from('post')
      .select('*')
      .limit(1)

    return Response.json({
      env,
      supabase: {
        error: error ? String(error.message || JSON.stringify(error)) : null,
        rowCount: Array.isArray(data) ? data.length : 0,
        sampleKeys: Array.isArray(data) && data[0] ? Object.keys(data[0]) : []
      }
    })
  } catch (e) {
    return Response.json({
      env,
      supabase: {
        error: e instanceof Error ? e.message : String(e),
        rowCount: 0,
        sampleKeys: []
      }
    })
  }
}

