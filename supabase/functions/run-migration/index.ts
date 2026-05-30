import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Step 1: Add columns
    const alterSQL = `
      ALTER TABLE exam_vouchers
        ADD COLUMN IF NOT EXISTS transferred_from_user_id UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS transferred_to_email TEXT,
        ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS transfer_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS original_owner_id UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS transfer_expires_at TIMESTAMPTZ;
    `

    // Use pg directly via service role
    const { error: e1 } = await supabase.from('exam_vouchers').select('id').limit(0)
    if (e1) throw e1

    // Execute via REST using pg
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/exec_ddl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      },
      body: JSON.stringify({ sql: alterSQL })
    })

    const result = await response.text()

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
