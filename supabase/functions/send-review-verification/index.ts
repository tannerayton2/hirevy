import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { review_id, origin } = await req.json();
    if (!review_id || typeof review_id !== 'string') {
      return json({ error: 'invalid request' }, 400);
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) return json({ error: 'email service unavailable' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: review, error } = await supabase
      .from('reviews')
      .select('id, reviewer_email, verify_token, status, created_at, provider_id')
      .eq('id', review_id)
      .maybeSingle();

    if (error || !review) return json({ error: 'not found' }, 404);
    if (review.status !== 'pending') return json({ ok: true });

    const ageMs = Date.now() - new Date(review.created_at).getTime();
    if (ageMs > 10 * 60 * 1000) return json({ error: 'expired' }, 410);

    // Rate limit: refuse if > 3 pending reviews from this email in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('reviewer_email', review.reviewer_email)
      .eq('status', 'pending')
      .gte('created_at', oneHourAgo);

    if ((count ?? 0) > 3) return json({ error: 'rate_limited' }, 429);

    const { data: provider } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', review.provider_id)
      .maybeSingle();

    const providerName = provider?.display_name || (provider?.username ? `@${provider.username}` : 'the provider');

    const safeOrigin = typeof origin === 'string' && /^https?:\/\//.test(origin)
      ? origin.replace(/\/$/, '')
      : 'https://hirevy.lovable.app';
    const verifyUrl = `${safeOrigin}/verify-review?token=${encodeURIComponent(review.verify_token)}`;

    const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafaf7;padding:32px;color:#111">
      <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;padding:32px">
        <h1 style="font-size:22px;margin:0 0 12px">Confirm your review</h1>
        <p style="font-size:15px;line-height:1.5;color:#444;margin:0 0 20px">
          Please confirm your review for <strong>${escapeHtml(providerName)}</strong> on HireVy. Once confirmed, it will be published on their profile.
        </p>
        <p style="margin:24px 0">
          <a href="${verifyUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Confirm my review</a>
        </p>
        <p style="font-size:12px;color:#888;margin-top:24px">If you didn't submit this review, you can ignore this email.</p>
      </div>
    </body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HireVy <onboarding@resend.dev>',
        to: [review.reviewer_email],
        subject: `Confirm your review for ${providerName}`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('resend failed', res.status, body);
      return json({ error: 'send_failed' }, 502);
    }
    await res.text();

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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
