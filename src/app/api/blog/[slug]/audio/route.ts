import { NextRequest } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// -----------------------------------------------------------------------------
// Alexis Rose persona 
// -----------------------------------------------------------------------------
const PERSONALITY_INSTRUCTIONS = `Affect/personality: A cheerful guide 

Tone: Friendly, clear, and reassuring, creating a calm atmosphere and making the listener feel confident and comfortable.

Pronunciation: Clear, articulate, and steady, ensuring each instruction is easily understood while maintaining a natural, conversational flow.

Pause: Brief, purposeful pauses after key instructions (e.g., "cross the street" and "turn right") to allow time for the listener to process the information and follow along.

Emotion: Warm and supportive, conveying empathy and care, ensuring the listener feels guided and safe throughout the journey.`;

// --- OpenAI + Supabase clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Voice/model defaults (kept)
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "sage"; // your default

// --------- helpers ---------
function htmlToPlain(s: string) {
  return String(s ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function b64ToBytes(b64: string) {
  return Buffer.from(b64, "base64");
}

function bytesToB64(bytes: Buffer | Uint8Array) {
  return Buffer.isBuffer(bytes) ? bytes.toString("base64") : Buffer.from(bytes).toString("base64");
}

// Naive sentence-aware chunker targeting ~3000 chars per chunk
function chunkText(input: string, target = 3000): string[] {
  if (input.length <= target) return [input];

  const sentences = input
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'])/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    const candidate = current ? current + " " + s : s;
    if (candidate.length <= target) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      if (s.length > target) {
        // hard-split very long single sentence
        for (let i = 0; i < s.length; i += target) {
          chunks.push(s.slice(i, i + target));
        }
        current = "";
      } else {
        current = s;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Read cached audio by slug (your schema)
async function getCachedAudio(slug: string) {
  const { data } = await supabase
    .from("blog_audio")
    .select("audio_data")
    .eq("slug", slug)
    .single();

  const b64 = data?.audio_data as string | undefined;
  if (!b64) return null;
  return b64ToBytes(b64);
}

async function saveAudioToCache(slug: string, bytes: Buffer) {
  const audio_b64 = bytesToB64(bytes);
  await supabase
    .from("blog_audio")
    .upsert({ slug, audio_data: audio_b64, created_at: new Date().toISOString() });
}

// --------- route ---------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> } // NextJS: params is a Promise
) {
  try {
    const { slug } = await params;
    if (!slug) return new Response("Missing slug", { status: 400 });

    // 1) Fetch blog
    const { data: blog, error } = await supabase
      .from("blogs")
      .select("id, slug, title, content")
      .eq("slug", slug)
      .single();

    if (error || !blog) return new Response("Blog not found", { status: 404 });

    // 2) Build narration text (kept your style)
    const title = blog.title || "A letter to Mila";
    const speakText = `${title}\n\n${htmlToPlain(blog.content)}`;

    // 3) Cache check (kept)
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

    // 4) Chunk long posts + generate per chunk (NEW)
    const parts = chunkText(speakText, 3000); // tweak target if needed
    const buffers: Buffer[] = [];

    for (let i = 0; i < parts.length; i++) {
      const prefix =
        parts.length > 1
          ? `Part ${i + 1} of ${parts.length}. Continue seamlessly with consistent pacing and tone.\n\n`
          : "";
      const input = prefix + parts[i];

      const speech = await openai.audio.speech.create({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input,
        instructions: PERSONALITY_INSTRUCTIONS, // kept
        response_format: "mp3", // keep your SDK field name
      });

      const arr = await speech.arrayBuffer();
      buffers.push(Buffer.from(arr));
    }

    // 5) Stitch MP3 bitstreams in order (simple concat works w/ same encoder settings)
    const finalBytes = Buffer.concat(buffers);

    // 6) Persist to blog_audio (kept)
    await saveAudioToCache(slug, finalBytes);

    // 7) Return the fresh audio
    return new Response(finalBytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(finalBytes.length),
      },
    });
  } catch (err: any) {
    console.error("[/api/blog/[slug]/audio] chunked error:", err);
    return new Response(
      JSON.stringify({
        error: err?.error?.message || err?.message || "Failed to generate or cache audio",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
