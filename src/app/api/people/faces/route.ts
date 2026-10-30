import { authorizeAdmin } from '@/utils/supabase/server';
import { isSitePhoto, thumbUrl } from '@/lib/search/collections';
import { FACE_AUTO, FACE_DIMENSIONS, FACE_JOIN } from '@/lib/people/faceConfig';
import type { FaceDetail, FaceScan } from '@/lib/people/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function GET(request: Request) {
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const params = new URL(request.url).searchParams;
  const group = params.get('group');
  const person = params.get('person');
  if ((group && !UUID.test(group)) || (person && !UUID.test(person)) || !!group === !!person) {
    return Response.json({ error: 'Ask for one group or one person.' }, { status: 400 });
  }
  const { data, error } = await supabase.rpc('people_faces', { group_id: group, person_id: person });
  if (error) return Response.json({ error: 'Unable to load those faces.' }, { status: 500 });
  const faces: FaceDetail[] = (data as FaceDetail[]).map(face => ({
    ...face, thumb: face.thumb && thumbUrl(face.thumb), photo_thumb: face.photo_thumb && thumbUrl(face.photo_thumb),
  }));
  return Response.json({ faces }, { headers: { 'Cache-Control': 'no-store' } });
}

const fraction = (value: unknown) => typeof value === 'number' && value >= 0 && value <= 1;
// Same folders the scanner uploads to (browserFaces.ts): site photos live under search/faces/site/.
const faceFolder = (key: string) => `search/faces/${isSitePhoto(key) ? `site${key}` : key}/`;

function validScan(scan: FaceScan) {
  if (!scan || typeof scan.photo_key !== 'string' || !scan.photo_key || scan.photo_key.length > 500 || scan.photo_key.startsWith('search/')) return false;
  return Array.isArray(scan.faces) && scan.faces.length <= 50 && scan.faces.every(face =>
    face && face.box && fraction(face.box.x) && fraction(face.box.y) && fraction(face.box.width) && fraction(face.box.height)
    && fraction(face.score)
    && Array.isArray(face.embedding) && face.embedding.length === FACE_DIMENSIONS && face.embedding.every(Number.isFinite)
    && typeof face.thumb_path === 'string' && face.thumb_path.startsWith(faceFolder(scan.photo_key)));
}

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const body = await request.json().catch(() => null) as { scans?: FaceScan[] } | null;
  const scans = body?.scans;
  if (!Array.isArray(scans) || !scans.length || scans.length > 10 || !scans.every(validScan)) {
    return Response.json({ error: 'Send up to 10 photo scans.' }, { status: 400 });
  }

  for (const scan of scans) {
    const faces = scan.faces.map(face => ({ ...face, embedding: `[${face.embedding.join(',')}]` }));
    const { data: replaced, error } = await supabase.rpc('save_face_scan', {
      photo_key: scan.photo_key, faces, join_similarity: FACE_JOIN, auto_similarity: FACE_AUTO,
    });
    if (error) return Response.json({ error: 'Unable to save the faces found. Please retry.' }, { status: 500 });
    // Thumbnails of a rescanned photo's old faces, unless the new scan reused the same paths.
    const kept = new Set(scan.faces.map(face => face.thumb_path));
    const stale = (replaced as string[]).filter(path => !kept.has(path));
    if (stale.length) await supabase.storage.from('mila_storage_bucket').remove(stale);
  }
  return Response.json({ saved: scans.length }, { headers: { 'Cache-Control': 'no-store' } });
}
