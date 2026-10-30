import { authorizeAdmin } from '@/utils/supabase/server';
import { COLLECTIONS, SITE_PHOTOS, isSitePhoto, thumbPathFor, type PhotoCollection } from '@/lib/search/collections';
import type { IndexItem, IndexStatus } from '@/lib/search/types';

type StatusRow = {
  photos: [string, PhotoCollection][];
  letters: { key: string; slug: string; title: string; content: string; hash: string }[];
  indexed: [string, string | null, string | null][];
};

export async function GET() {
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const [{ data, error }, scans] = await Promise.all([supabase.rpc('search_index_status'), supabase.rpc('face_scan_keys')]);
  if (error || scans.error) return Response.json({ error: 'Unable to read the search index.' }, { status: 500 });
  const { photos, letters, indexed } = data as StatusRow;
  const scanned = new Set(scans.data as string[]);

  const indexedHash = new Map(indexed.map(([key, hash]) => [key, hash]));
  const sources = [...photos.map(([key, collection]) => ({ key, collection })), ...SITE_PHOTOS];
  const pendingPhotos = sources.filter(source => !indexedHash.has(source.key));
  const pendingLetters = letters.filter(letter => indexedHash.get(letter.key) !== letter.hash);
  const known = new Set([...sources.map(source => source.key), ...letters.map(letter => letter.key)]);

  const status: IndexStatus = {
    collections: COLLECTIONS.map(({ id, label }) => {
      if (id === 'letters') return { id, label, total: letters.length, indexed: letters.length - pendingLetters.length };
      const total = sources.filter(source => source.collection === id).length;
      return { id, label, total, indexed: total - pendingPhotos.filter(source => source.collection === id).length };
    }),
    pending: {
      photos: pendingPhotos,
      letters: pendingLetters.map(({ key, title, content, hash }) => ({ key, title, content, hash })),
    },
    orphans: indexed.map(([key]) => key).filter(key => !known.has(key)),
    // Faces are found in indexed photos, so a photo is scanned after (or with) its indexing.
    faces: {
      scanned: sources.filter(source => scanned.has(source.key)).length,
      total: sources.length,
      pending: sources.filter(source => !scanned.has(source.key)).map(source => source.key),
    },
  };
  return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
}

const COLLECTION_IDS = new Set<string>(COLLECTIONS.map(collection => collection.id));

function validItem(item: IndexItem) {
  if (!item || typeof item.key !== 'string' || !item.key || item.key.length > 500 || !COLLECTION_IDS.has(item.collection)) return false;
  if (!Array.isArray(item.embedding) || item.embedding.length !== 768 || !item.embedding.every(Number.isFinite)) return false;
  if (item.kind === 'letter') {
    return item.collection === 'letters' && /^letter:[0-9a-f-]{36}$/.test(item.key) && /^[0-9a-f]{32}$/.test(item.source_hash ?? '');
  }
  return item.kind === 'photo' && item.collection !== 'letters'
    && (isSitePhoto(item.key) ? SITE_PHOTOS.some(photo => photo.key === item.key) : !item.key.startsWith('search/'))
    && item.thumb_path === thumbPathFor(item.key)
    && (item.color == null || /^#[0-9a-f]{6}$/.test(item.color))
    && [item.width, item.height].every(size => size == null || (Number.isInteger(size) && size > 0));
}

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const supabase = await authorizeAdmin();
  if (supabase instanceof Response) return supabase;
  const body = await request.json().catch(() => null) as { items?: IndexItem[]; remove?: string[] } | null;
  const items = body?.items ?? [];
  const remove = body?.remove ?? [];
  if (!body || !Array.isArray(items) || !Array.isArray(remove) || items.length > 25 || remove.length > 100 ||
    !items.every(validItem) || !remove.every(key => typeof key === 'string' && key.length > 0 && key.length <= 500)) {
    return Response.json({ error: 'Send up to 25 indexed items or up to 100 keys to remove.' }, { status: 400 });
  }

  if (items.length) {
    const { error } = await supabase.from('search_items').upsert(items.map(item => ({
      key: item.key, kind: item.kind, collection: item.collection,
      thumb_path: item.kind === 'photo' ? item.thumb_path : null,
      color: item.color ?? null, width: item.width ?? null, height: item.height ?? null,
      source_hash: item.kind === 'letter' ? item.source_hash : null,
      embedding: `[${item.embedding.join(',')}]`, indexed_at: new Date().toISOString(),
    })));
    if (error) return Response.json({ error: 'Unable to save to the search index. Please retry.' }, { status: 500 });
  }

  let removed = 0;
  if (remove.length) {
    const { data, error } = await supabase.from('search_items').delete().in('key', remove).select('thumb_path');
    if (error) return Response.json({ error: 'Unable to remove from the search index. Please retry.' }, { status: 500 });
    removed = data.length;
    // A photo that left the index takes its faces with it.
    const { data: faceThumbs } = await supabase.rpc('forget_photo_faces', { photo_keys: remove });
    const thumbs = [...data.map(row => row.thumb_path), ...((faceThumbs as string[] | null) ?? [])].filter((path): path is string => !!path);
    // A thumbnail left behind is harmless; the row that pointed at it is gone.
    if (thumbs.length) await supabase.storage.from('mila_storage_bucket').remove(thumbs);
  }
  return Response.json({ saved: items.length, removed }, { headers: { 'Cache-Control': 'no-store' } });
}
