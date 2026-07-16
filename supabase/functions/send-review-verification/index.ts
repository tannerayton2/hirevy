import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { review_id, origin, review_type } = await req.json();
    if (!review_id || typeof review_id !== 'string') {
      return json({ error: 'invalid request' }, 400);
    }
    const rType: 'public' | 'unclaimed' = review_type === 'unclaimed' ? 'unclaimed' : 'public';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let review: {
      id: string;
      reviewer_email: string;
      verify_token: string;
      status: string;
      created_at: string;
      provider_id: string | null;
      coach_name: string | null;
    } | null = null;

    if (rType === 'public') {
      const { data } = await supabase
        .from('reviews')
        .select('id, reviewer_email, verify_token, status, created_at, provider_id')
        .eq('id', review_id)
        .maybeSingle();
      if (data) review = { ...data, coach_name: null };
    } else {
      const { data } = await supabase
        .from('unclaimed_reviews')
        .select('id, reviewer_email, verify_token, status, created_at, coach_name, linked_profile_id')
        .eq('id', review_id)
        .maybeSingle();
      if (data) review = {
        id: data.id,
        reviewer_email: data.reviewer_email,
        verify_token: data.verify_token,
        status: data.status,
        created_at: data.created_at,
        provider_id: data.linked_profile_id,
        coach_name: data.coach_name,
      };
    }

    if (!review) return json({ error: 'not found' }, 404);
    if (review.status !== 'pending') return json({ ok: true });

    const ageMs = Date.now() - new Date(review.created_at).getTime();
    if (ageMs > 10 * 60 * 1000) return json({ error: 'expired' }, 410);

    // Rate limit: refuse if > 3 pending reviews from this email in last hour (across both tables)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [{ count: c1 }, { count: c2 }] = await Promise.all([
      supabase.from('reviews').select('id', { count: 'exact', head: true })
        .eq('reviewer_email', review.reviewer_email).eq('status', 'pending').gte('created_at', oneHourAgo),
      supabase.from('unclaimed_reviews').select('id', { count: 'exact', head: true })
        .eq('reviewer_email', review.reviewer_email).eq('status', 'pending').gte('created_at', oneHourAgo),
    ]);
    if (((c1 ?? 0) + (c2 ?? 0)) > 3) return json({ error: 'rate_limited' }, 429);

    let providerName = review.coach_name || 'the provider';
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

    // Send via Lovable's built-in transactional email (routes through notify.aytopus.com)
    const { data: sendData, error: sendError } = await supabase.functions.invoke(
      'send-transactional-email',
      {
        body: {
          templateName: 'review-verification',
          recipientEmail: review.reviewer_email,
          idempotencyKey: `review-verify-${rType}-${review.id}`,
          templateData: { providerName, verifyUrl },
        },
      },
    );

    if (sendError) {
      console.error('send-transactional-email failed', sendError);
      return json({ error: 'send_failed' }, 502);
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
