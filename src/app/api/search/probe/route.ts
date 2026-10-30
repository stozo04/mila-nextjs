// TEMPORARY: measures the search model's cold and warm timings on a real Vercel preview.
// Answers on preview deployments only, and is deleted before search anything ships.
import { embedQuery, searchModelLoaded } from '@/lib/search/textEmbedder';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview') return Response.json({ error: 'Not found.' }, { status: 404 });
  const query = new URL(request.url).searchParams.get('q')?.slice(0, 200) || 'beach';
  const warm = searchModelLoaded();
  const start = performance.now();
  try {
    const embedding = await embedQuery(query);
    return Response.json({
      warm, ms: Math.round(performance.now() - start), dims: embedding.length, head: embedding.slice(0, 4),
      rssMB: Math.round(process.memoryUsage().rss / 1e6),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ warm, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
