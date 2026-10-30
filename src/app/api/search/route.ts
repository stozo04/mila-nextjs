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

  let embedding: number[];
  try {
    embedding = await embedQuery(query);
  } catch (error) {
    console.error('Search model failed:', error);
    return Response.json({ error: 'Search is unavailable right now. Please try again.' }, { status: 503 });
  }
  const query_embedding = `[${embedding.join(',')}]`;

  const [photos, letters] = await Promise.all([
    supabase.rpc('match_search_photos', { query_embedding, match_count: 300 }),
    includeLetters ? supabase.rpc('match_search_letters', { query_embedding, match_count: 20 }) : null,
  ]);
  if (photos.error || letters?.error) {
    console.error('Search query failed:', photos.error ?? letters?.error);
    return Response.json({ error: 'Search is unavailable right now. Please try again.' }, { status: 503 });
  }

  type PhotoRow = Scored & { key: string; collection: PhotoCollection; thumb_path: string | null };
  type LetterRow = Scored & { key: string; slug: string; title: string; date: string; featured_image: string | null };
  // Ranked by how far each match stands out from its own kind's median, since letters and
  // photos score on different scales.
  const ranked: { lift: number; result: SearchResult }[] = [
    ...keep(photos.data as PhotoRow[], PHOTO).map(row => ({
      lift: row.score - row.median_score,
      result: { kind: 'photo', key: row.key, url: photoUrl(row.key), thumb: row.thumb_path && thumbUrl(row.thumb_path), collection: row.collection, score: row.score } satisfies PhotoResult,
    })),
    ...keep((letters?.data ?? []) as LetterRow[], LETTER).map(row => ({
      lift: row.score - row.median_score,
      result: { kind: 'letter', key: row.key, slug: row.slug, title: row.title, date: row.date, image: row.featured_image, score: row.score } satisfies LetterResult,
    })),
  ];
  const results = ranked.sort((a, b) => b.lift - a.lift).map(entry => entry.result);
  return Response.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
}
