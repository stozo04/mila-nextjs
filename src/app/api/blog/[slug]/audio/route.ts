import { NextRequest } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60; // Hobby limit (or delete this line)

// === Persona (yours) ===
const PERSONALITY_INSTRUCTIONS = `Affect/personality: A cheerful guide 

Tone: Friendly, clear, and reassuring, creating a calm atmosphere and making the listener feel confident and comfortable.

Pronunciation: Clear, articulate, and steady, ensuring each instruction is easily understood while maintaining a natural, conversational flow.

Pause: Brief, purposeful pauses after key instructions (e.g., "cross the street" and "turn right") to allow time for the listener to process the information and follow along.

Emotion: Warm and supportive, conveying empathy and care, ensuring the listener feels guided and safe throughout the journey.`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "sage";

// ---------- helpers ----------
const b64ToBytes = (b64: string) => Buffer.from(b64, "base64");
const bytesToB64 = (bytes: Buffer | Uint8Array) =>
  Buffer.isBuffer(bytes) ? bytes.toString("base64") : Buffer.from(bytes).toString("base64");

function htmlToPlain(s: string) {
  return String(s ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Smaller chunks + hard cap so we finish under 60s
function chunkText(input: string, target = 900, maxChunks = 6): string[] {
  if (input.length <= target) return [input];
  const sentences = input
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'])/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    const candidate = current ? current + " " + s : s;
    if (candidate.length <= target) current = candidate;
    else {
      if (current) chunks.push(current);
      if (s.length > target) {
        for (let i = 0; i < s.length && chunks.length < maxChunks; i += target) {
          chunks.push(s.slice(i, i + target));
        }
        current = "";
      } else current = s;
    }
    if (chunks.length >= maxChunks) break;
  }
  if (current && chunks.length < maxChunks) chunks.push(current);
  return chunks;
}

// Simple table cache (your schema)
async function getCachedAudio(slug: string) {
  const { data } = await supabase
    .from("blog_audio")
    .select("audio_data")
    .eq("slug", slug)
    .single();
  const b64 = data?.audio_data as string | undefined;
  return b64 ? b64ToBytes(b64) : null;
}
async function saveAudioToCache(slug: string, bytes: Buffer) {
  await supabase.from("blog_audio").upsert({
    slug,
    audio_data: bytesToB64(bytes),
    created_at: new Date().toISOString(),
  });
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Per-chunk TTS with a short timeout and 1 retry
async function ttsChunk(input: string, timeoutMs = 12000): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input,
      instructions: PERSONALITY_INSTRUCTIONS,
      response_format: "mp3",
      signal: controller.signal as any,
    });
    const buf = Buffer.from(await resp.arrayBuffer());
    return buf;
  } catch {
    // quick retry without the abort controller
    const retry = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input,
      instructions: PERSONALITY_INSTRUCTIONS,
      response_format: "mp3",
    });
    return Buffer.from(await retry.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const started = Date.now();
  try {
    const { slug } = await params;
    if (!slug) return json(400, { error: "Missing slug" });

    // 1) Blog
    const { data: blog, error } = await supabase
      .from("blogs")
      .select("id, slug, title, content")
      .eq("slug", slug)
      .single();
    if (error) return json(500, { error: "DB error fetching blog" });
    if (!blog) return json(404, { error: "Blog not found" });

    // 2) Text
    const title = blog.title || "A letter to Mila";
    const speakText = `${title}\n\n${htmlToPlain(blog.content)}`;
    if (speakText.length < 8) return json(400, { error: "Empty blog content" });

    // 3) Cache
    const cached = await getCachedAudio(slug);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400",
          "Content-Length": String(cached.byteLength),
        },
      });
    }

    // 4) Chunk + synth (stay under budget)
    const parts = chunkText(speakText, 900, 6);
    const buffers: Buffer[] = [];
    for (let i = 0; i < parts.length; i++) {
      const elapsed = Date.now() - started;
      if (elapsed > 45_000) {
        // running out of time → tell client to retry soon
        return json(202, { pending: true, reason: "still_generating" });
      }
      const prefix =
        parts.length > 1
          ? `Part ${i + 1} of ${parts.length}. Continue seamlessly with consistent pacing and tone.\n\n`
          : "";
      const input = prefix + parts[i];
      const audio = await ttsChunk(input, 12_000);
      buffers.push(audio);
    }

    const finalBytes = Buffer.concat(buffers);
    await saveAudioToCache(slug, finalBytes);

    return new Response(finalBytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(finalBytes.length),
        "X-Gen-Time": String(Date.now() - started),
        "X-Chunks": String(parts.length),
      },
    });
  } catch (err: any) {
    console.error("[/api/blog/[slug]/audio] error:", err);
    return json(500, { error: err?.message || "Failed to generate or cache audio" });
  }
}
