import { authorizeAdmin } from '@/utils/supabase/server';

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const { slug } = await params;
  if (!/^[a-z0-9_-]{1,200}$/i.test(slug)) return Response.json({ error: 'Invalid letter slug.' }, { status: 400 });
  const { data: images, error } = await supabase.from('blogs')
    .select('featured_image, detail_image').eq('slug', slug).maybeSingle();
  if (error) return Response.json({ error: 'Unable to load the letter’s image selections.' }, { status: 500 });
  if (!images) return Response.json({ error: 'No matching blog letter exists for this month.' }, { status: 404 });
  return Response.json({ images }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, { params }: Context) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  if (!/^[a-z0-9_-]{1,200}$/i.test(slug) || !body ||
    !['featured_image', 'detail_image'].includes(body.role) || typeof body.filename !== 'string' ||
    !/^[^/\\?#%\u0000-\u001f]{1,255}\.(jpe?g|png|webp|gif)$/i.test(body.filename)) {
    return Response.json({ error: 'Choose a gallery photo and a valid image role.' }, { status: 400 });
  }
  const bucket = supabase.storage.from('mila_storage_bucket');
  const path = `birthday/${slug}/${body.filename}`;
  const { data: exists, error: storageError } = await bucket.exists(path);
  if (storageError && ![400, 404].includes(storageError.status ?? 0)) return Response.json({ error: 'Unable to verify the selected photo. Please retry.' }, { status: 500 });
  if (!exists) return Response.json({ error: 'This photo is no longer in this month’s gallery.' }, { status: 404 });
  const { data: { publicUrl } } = bucket.getPublicUrl(path);
  const { data: images, error } = await supabase.from('blogs')
    .update({ [body.role]: publicUrl }).eq('slug', slug)
    .select('featured_image, detail_image').maybeSingle();
  if (error) return Response.json({ error: 'Unable to confirm the image selection. Reload before retrying.' }, { status: 500 });
  if (!images) return Response.json({ error: 'No matching blog letter exists for this month.' }, { status: 404 });
  return Response.json({ images }, { headers: { 'Cache-Control': 'no-store' } });
}
