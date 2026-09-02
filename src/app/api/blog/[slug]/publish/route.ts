import { authorizeAdmin } from '@/utils/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const { slug } = await params;
  if (!/^[a-z0-9_-]{1,200}$/i.test(slug)) {
    return Response.json({ error: 'Invalid letter slug.' }, { status: 400 });
  }
  const { data: blog, error } = await supabase.from('blogs')
    .update({ is_draft: false }).eq('slug', slug).eq('is_draft', true).select('*').maybeSingle();
  if (error) return Response.json({ error: 'Unable to confirm publication. Reload the letter before retrying.' }, { status: 500 });
  if (!blog) return Response.json({ error: 'This letter is no longer a draft or is unavailable. Reload the page.' }, { status: 409 });
  return Response.json({ blog }, { headers: { 'Cache-Control': 'no-store' } });
}
