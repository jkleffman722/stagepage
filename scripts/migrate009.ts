import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('show_advances')
    .select('field_confirmations')
    .limit(1)
  if (!error) {
    console.log('✓ field_confirmations column already exists')
  } else {
    console.log('Column missing:', error.message)
    console.log('\nRun this in the Supabase SQL editor:')
    console.log("ALTER TABLE show_advances ADD COLUMN IF NOT EXISTS field_confirmations JSONB NOT NULL DEFAULT '{}'::jsonb;")
  }
}

main().catch(console.error)
