import { createClient } from '@/utils/supabase/server';
import { embedQuery } from '@/lib/search/textEmbedder';
import { photoUrl, thumbUrl, type PhotoCollection } from '@/lib/search/collections';
import type { LetterResult, PhotoResult, SearchResult } from '@/lib/search/types';

export const runtime = 'nodejs';
export const maxDuration = 60; // a cold start downloads and loads the model first

// Calibrated on Mila's own photos and letters. Every query has its own baseline (nonsense
// like "zzqx" still tops out near 0.63), so a match must clear a floor and also stand out
// from the median score across everything of its kind. Letters compare text with text and
// score higher across the board, so they get their own floor.
const PHOTO = { floor: 0.6, margin: 0.065 };
const LETTER = { floor: 0.66, margin: 0.045 };

type Scored = { score: number; median_score: number };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Pulls whole-word, any-case names out of a query: "Steven and mila at the beach" gives
 *  Steven and Mila, and the scene "at the beach". Longer names first, so "Grandma Kathy"
 *  wins over "Kathy". */
function splitPeople(query: string, people: { id: string; name: string }[]) {
  let rest = query;
  const found: { id: string; name: string }[] = [];
  for (const person of [...people].sort((a, b) => b.name.length - a.name.length)) {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escape(person.name.trim())}(?=$|[^\\p{L}\\p{N}])`, 'iu');
    if (!pattern.test(rest)) continue;
    found.push(person);
    rest = rest.replace(pattern, '$1 ');
  }
  // Joining words between names ("Mila and Steven") are not part of the scene.
  const scene = found.length ? rest.replace(/(^|\s)(and|with|&|plus)(?=\s|$)/giu, ' ').replace(/[\s,]+/g, ' ').trim() : rest.trim();
  return { people: found, scene };
}
const keep = <T extends Scored>(rows: T[], { floor, margin }: typeof PHOTO) =>
  rows.filter(row => row.score >= floor && row.score >= row.median_score + margin);

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to continue.' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const query = params.get('q')?.trim() ?? '';
  if (!query || query.length > 200) return Response.json({ error: 'Type up to 200 characters to search.' }, { status: 400 });
  const includeLetters = params.get('letters') === '1';

  // Named people in the query filter the photos; whatever words remain describe the scene.
  const named = await supabase.rpc('people_names');
  if (named.error) return Response.json({ error: 'Search is unavailable right now. Please try again.' }, { status: 503 });
  const { people, scene } = splitPeople(query, named.data as { id: string; name: string }[]);
  const personIds = people.map(person => person.id);

  let query_embedding: string | null = null;
  if (scene || includeLetters) {
    try {
      query_embedding = `[${(await embedQuery(scene || query)).join(',')}]`;
    } catch (error) {
      console.error('Search model failed:', error);
      return Response.json({ error: 'Search is unavailable right now. Please try again.' }, { status: 503 });
    }
  }

  const [photos, letters] = await Promise.all([
    !people.length ? supabase.rpc('match_search_photos', { query_embedding, match_count: 300 })
      : scene ? supabase.rpc('match_search_photos_among', { query_embedding, person_ids: personIds, match_count: 300 })
      : supabase.rpc('photos_with_people', { person_ids: personIds }),
    includeLetters ? supabase.rpc('match_search_letters', { query_embedding, match_count: 20 }) : null,
  ]);
  if (photos.error || letters?.error) {
    console.error('Search query failed:', photos.error ?? letters?.error);
    return Response.json({ error: 'Search is unavailable right now. Please try again.' }, { status: 503 });
  }

  type PhotoRow = Scored & { key: string; collection: PhotoCollection; thumb_path: string | null };
  type LetterRow = Scored & { key: string; slug: string; title: string; date: string; featured_image: string | null };
  const photo = (row: { key: string; collection: PhotoCollection; thumb_path: string | null }, score: number): PhotoResult =>
    ({ kind: 'photo', key: row.key, url: photoUrl(row.key), thumb: row.thumb_path && thumbUrl(row.thumb_path), collection: row.collection, score });
  // Names alone: every photo of those people counts, whatever it looks like.
  const photoRows = people.length && !scene
    ? (photos.data as [string, PhotoCollection, string | null][]).map(([key, collection, thumb_path]) => ({ lift: 0, result: photo({ key, collection, thumb_path }, 1) }))
    : keep(photos.data as PhotoRow[], PHOTO).map(row => ({ lift: row.score - row.median_score, result: photo(row, row.score) }));
  // Ranked by how far each match stands out from its own kind's median, since letters and
  // photos score on different scales.
  const ranked: { lift: number; result: SearchResult }[] = [
    ...photoRows,
    ...keep((letters?.data ?? []) as LetterRow[], LETTER).map(row => ({
      lift: row.score - row.median_score,
      result: { kind: 'letter', key: row.key, slug: row.slug, title: row.title, date: row.date, image: row.featured_image, score: row.score } satisfies LetterResult,
    })),
  ];
  const results = ranked.sort((a, b) => b.lift - a.lift).map(entry => entry.result);
  return Response.json({ results, people: people.map(person => person.name), scene: !!scene }, { headers: { 'Cache-Control': 'no-store' } });
}
