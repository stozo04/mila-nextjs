import { authorizeAdmin } from '@/utils/supabase/server';
import { hasForeignMarkup, MAX_LETTER_HTML_LENGTH } from '@/lib/letterHtml';

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
  const body = await request.json().catch(() => null);
  const html = body?.html;
  if (typeof html !== 'string' || html.length > MAX_LETTER_HTML_LENGTH) {
    return Response.json({ error: 'The letter text is missing or too long.' }, { status: 400 });
  }
  if (hasForeignMarkup(html)) {
    return Response.json({ error: 'The letter contains formatting the editor cannot save.' }, { status: 400 });
  }
  const { data: blog, error } = await supabase.from('blogs')
    .update({ content: html }).eq('slug', slug).eq('is_draft', true).select('*').maybeSingle();
  if (error) return Response.json({ error: 'Unable to save the draft. Your text is still in the editor; try again.' }, { status: 500 });
  if (!blog) return Response.json({ error: 'This letter is no longer a draft or is unavailable. Copy your text, then reload the page.' }, { status: 409 });
  return Response.json({ blog }, { headers: { 'Cache-Control': 'no-store' } });
}
