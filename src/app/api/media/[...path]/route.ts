import type { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { MEDIA_ROUTE } from '@/lib/media';

const BUCKET = 'mila_storage_bucket';

// Signed-in visitors get a redirect to a signed URL; everyone else gets 401.
// The signature is created with the visitor's own session, so storage RLS still
// decides which objects they can reach.
export async function GET(request: NextRequest) {
  let segments: string[];
  try {
    segments = request.nextUrl.pathname.slice(MEDIA_ROUTE.length).split('/').map(decodeURIComponent);
  } catch {
    return Response.json({ error: 'Invalid photo path.' }, { status: 400 });
  }
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..' || segment.includes('\\'))) {
    return Response.json({ error: 'Invalid photo path.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to continue.' }, { status: 401 });

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(segments.join('/'), 3600);
  if (error || !data) return Response.json({ error: 'Photo not found.' }, { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, 'Cache-Control': 'private, max-age=300' },
  });
}
