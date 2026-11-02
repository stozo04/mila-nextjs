import { authorizeAdmin } from '@/utils/supabase/server';
import { readPeople } from '@/lib/people/server';
import { FACE_AUTO, MATCH_BATCH } from '@/lib/people/faceConfig';
import type { MatchBatch, MatchRequest } from '@/lib/people/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function validRequest(body: MatchRequest | null) {
  if (body?.action === 'undo') return true;
  return body?.action === 'match' && UUID.test(String(body.run)) && (body.after === null || UUID.test(String(body.after)));
}

// Match with named people runs as many short requests (one batch each), so no single
// request nears the database time limit and the page can show progress.
export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const body = await request.json().catch(() => null) as MatchRequest | null;
  if (!validRequest(body)) return Response.json({ error: 'That match request is not valid.' }, { status: 400 });

  if (body!.action === 'undo') {
    const { data, error } = await supabase.rpc('people_match_undo');
    if (error) return Response.json({ error: 'Unable to undo the match. Please retry.' }, { status: 500 });
    const list = await readPeople(supabase, false);
    if (!list) return Response.json({ error: 'Undone, but unable to reload people. Refresh the page.' }, { status: 500 });
    return Response.json({ restored: data as number, list }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const { run, after } = body as Extract<MatchRequest, { action: 'match' }>;
  const { data, error } = await supabase.rpc('people_match', { run, after_id: after, batch: MATCH_BATCH, best_similarity: FACE_AUTO });
  if (error) return Response.json({ error: 'Matching stopped partway. Match again to carry on, or Undo last match.' }, { status: 500 });
  return Response.json(data as MatchBatch, { headers: { 'Cache-Control': 'no-store' } });
}
