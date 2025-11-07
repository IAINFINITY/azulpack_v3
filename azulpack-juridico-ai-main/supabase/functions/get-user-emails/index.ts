import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create client with anon key to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user is authenticated and is admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { userIds, userEmails } = await req.json()

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Se userIds for fornecido (requer admin), buscar emails por IDs
    if (userIds && Array.isArray(userIds)) {
      // Check if user is admin
      const { data: roleData, error: roleError } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single()

      if (roleError || !roleData) {
        return new Response(JSON.stringify({ error: 'Admin access required for userIds lookup' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const uniqueIds = Array.from(new Set(userIds.filter((id: string) => !!id)))
      const mappings: { user_id: string, email: string | null }[] = []

      for (const id of uniqueIds) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id)
        mappings.push({ user_id: id, email: data?.user?.email ?? null })
      }

      return new Response(JSON.stringify({ mappings }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Se userEmails for fornecido, buscar usuários por emails
    if (userEmails && Array.isArray(userEmails)) {
      const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers()
      
      const foundUsers = userEmails.map((email: string) => {
        const user = allUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
        return user ? { id: user.id, email: user.email } : null
      }).filter(u => u !== null)

      return new Response(JSON.stringify({ users: foundUsers }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'userIds or userEmails must be provided' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in get-user-emails function:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})