import { authorizeAdmin } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const { data, error } = await supabase.rpc('mila_month_preview');
  if (error) return Response.json({ error: 'Unable to preview the month.' }, { status: 500 });
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Expected a JSON message and preview slug.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || typeof body.expected_slug !== 'string' ||
    !/^[a-z0-9-]{1,100}$/.test(body.expected_slug) ||
    (body.message !== undefined && (typeof body.message !== 'string' || body.message.length > 5000))) {
    return Response.json({ error: 'Provide a preview slug and an optional message of at most 5000 characters.' }, { status: 400 });
  }
  const { data, error } = await supabase.rpc('prepare_milas_month', {
    expected_slug: body.expected_slug, message: body.message ?? '',
  });
  if (error) {
    const status = error.code === '23505' ? 409 : error.code === '42501' ? 403 : error.code === '22023' ? 400 : 500;
    const message = status === 409 ? 'This month already has a journey card or letter. Nothing was created or changed.'
      : status === 400 ? 'The preview changed or the message is invalid. Reload the preview.'
      : 'Unable to confirm preparation. Reload the preview before retrying; existing records will be left unchanged.';
    return Response.json({ error: message }, { status });
  }
  return Response.json(data, { status: 201 });
}
