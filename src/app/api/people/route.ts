import { authorizeAdmin } from '@/utils/supabase/server';
import { readPeople } from '@/lib/people/server';
import type { PeopleAction } from '@/lib/people/types';

export async function GET(request: Request) {
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const list = await readPeople(supabase, new URL(request.url).searchParams.get('hidden') === '1');
  if (!list) return Response.json({ error: 'Unable to load people.' }, { status: 500 });
  return Response.json(list, { headers: { 'Cache-Control': 'no-store' } });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ids = (value: unknown, min: number) => Array.isArray(value) && value.length >= min && value.length <= 200 && value.every(id => typeof id === 'string' && UUID.test(id));
const name = (value: unknown) => typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 60;

function validAction(body: PeopleAction | null) {
  switch (body?.action) {
    case 'name': return ids(body.group_ids, 1) && name(body.name);
    case 'merge': return ids(body.group_ids, 2);
    case 'remove-face': return UUID.test(String(body.face_id));
    case 'hide': return ids(body.group_ids, 1) && typeof body.hidden === 'boolean';
    case 'rename': return UUID.test(String(body.person_id)) && name(body.name);
    case 'unname': return UUID.test(String(body.person_id));
    default: return false;
  }
}

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const body = await request.json().catch(() => null) as PeopleAction | null;
  if (!validAction(body)) return Response.json({ error: 'That change to people is not valid.' }, { status: 400 });

  const { error } = await supabase.rpc('people_apply', { change: body });
  if (error) {
    const taken = error.code === '23505';
    return Response.json({ error: taken ? 'Someone already has that name. Type it on a group to add the group to them.' : 'Unable to save that change. Please retry.' },
      { status: taken ? 409 : 500 });
  }
  const list = await readPeople(supabase, new URL(request.url).searchParams.get('hidden') === '1');
  if (!list) return Response.json({ error: 'Saved, but unable to reload people. Refresh the page.' }, { status: 500 });
  return Response.json(list, { headers: { 'Cache-Control': 'no-store' } });
}
