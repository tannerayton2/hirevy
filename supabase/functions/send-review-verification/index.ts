import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { review_id, origin } = await req.json();
    if (!review_id || typeof review_id !== 'string') {
      return json({ error: 'invalid request' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: review } = await supabase
      .from('reviews')
      .select('id, reviewer_email, verify_token, status, created_at, provider_id')
      .eq('id', review_id)
      .maybeSingle();

    if (!review) return json({ error: 'not found' }, 404);
    if (review.status !== 'pending') return json({ ok: true });

    const ageMs = Date.now() - new Date(review.created_at).getTime();
    if (ageMs > 10 * 60 * 1000) return json({ error: 'expired' }, 410);

    // Rate limit: refuse if > 3 pending reviews from this email in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: pendingCount } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('reviewer_email', review.reviewer_email)
      .eq('status', 'pending')
      .gte('created_at', oneHourAgo);
    if ((pendingCount ?? 0) > 3) return json({ error: 'rate_limited' }, 429);


    let providerName = 'the provider';
    if (review.provider_id) {
      const { data: provider } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', review.provider_id)
        .maybeSingle();
      if (provider) {
        providerName = provider.display_name || (provider.username ? `@${provider.username}` : providerName);
      }
    }


    const safeOrigin = typeof origin === 'string' && /^https?:\/\//.test(origin)
      ? origin.replace(/\/$/, '')
      : 'https://aytopus.com';
    const verifyUrl = `${safeOrigin}/verify-review?token=${encodeURIComponent(review.verify_token)}`;

    // Send via Lovable's built-in transactional email (routes through notify.aytopus.com).
    // Call directly with the service_role key so the downstream open-relay guard
    // (which requires a service_role JWT) accepts the request.
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const sendResp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({
        templateName: 'review-verification',
        recipientEmail: review.reviewer_email,
        idempotencyKey: `review-verify-${review.id}`,
        templateData: { providerName, verifyUrl },
      }),
    });

    const sendData = await sendResp.json().catch(() => ({}));
    if (!sendResp.ok) {
      console.error('send-transactional-email failed', sendResp.status, sendData);
      return json({ error: 'send_failed', status: sendResp.status, detail: sendData }, 502);
    }

    return json({ ok: true, result: sendData });
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
