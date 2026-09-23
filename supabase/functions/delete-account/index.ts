import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identify the caller from their own JWT (never trust a client-supplied user id).
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);
    const uid = userData.user.id;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Best-effort cleanup of storage objects keyed by user id. Table rows are
    // handled by ON DELETE CASCADE from auth.users once the account is removed.
    for (const bucket of ['avatars', 'message-attachments', 'proof-uploads']) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(uid);
        if (files?.length) {
          await admin.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
        }
      } catch {
        // Bucket may not exist or user may have no files there — not fatal.
      }
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(uid);
    if (deleteErr) {
      console.error('delete-account: deleteUser failed', deleteErr);
      return json({ error: 'delete_failed' }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
