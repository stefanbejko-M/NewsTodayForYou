import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function run(){/* Implement licensed ingestion here */}
run().catch(e=>{console.error(e);process.exit(1)})
