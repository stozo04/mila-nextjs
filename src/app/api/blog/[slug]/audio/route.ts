import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import { stripHtml } from "string-strip-html";
import { Buffer } from "node:buffer"; // explicit for TS intellisense

// -----------------------------------------------------------------------------
// Runtime & limits
// -----------------------------------------------------------------------------
export const runtime = "nodejs";   // leave Edge to avoid 25 s TTFB cap
export const maxDuration = 60;     // seconds (raise if needed)

// -----------------------------------------------------------------------------
// Alexis Rose persona (kept for later prompt-engineering tweaks)
// -----------------------------------------------------------------------------
const PERSONALITY_INSTRUCTIONS = `
You are Alexis Rose from Schitt's Creek:
– A fabulously over-the-top Canadian socialite turned town insider
– Warm, melodramatic with that signature Canadian lilt
– Drawn-out vowels on fun words ("fuuun", "fabuuulous")
– Boutique-babble ("vintage vibe", "artisan aesthetic")
– Occasional French-flavored "oui, oui"
– Every moment is a VIP event—dramatic encouragement, self-awareness, endlessly charming
`.trim();

// -----------------------------------------------------------------------------
// DB helpers
// -----------------------------------------------------------------------------
async function getAudioFromCache(slug: string): Promise<Buffer | null> {
  const { data } = await supabase
    .from("blog_audio")
    .select("audio_data")
    .eq("slug", slug)
    .single();

  return data?.audio_data ? Buffer.from(data.audio_data, "base64") : null;
}

async function saveAudioToCache(slug: string, buf: Buffer) {
  await supabase.from("blog_audio").upsert({
    slug,
    audio_data: buf.toString("base64"),
    created_at: new Date().toISOString(),
  });
}

// -----------------------------------------------------------------------------
// Utility
// -----------------------------------------------------------------------------
function splitIntoChunks(text: string, max = 3800) {
  const out: string[] = [];
  let buf = "";
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (buf.length + sentence.length > max) {
      if (buf) out.push(buf.trim());
      buf = sentence;
    } else {
      buf += (buf ? " " : "") + sentence;
    }
  }
  if (buf) out.push(buf.trim());
  return out;
}

// -----------------------------------------------------------------------------
// Route handler
// -----------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const { slug } = params;
  if (!slug) return new NextResponse("Missing slug", { status: 400 });

  /* 1️⃣  Try cached MP3 first */
  const cached = await getAudioFromCache(slug);
  if (cached) {
    return new NextResponse(cached, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  }

  /* 2️⃣  Fetch + sanitise blog post */
  const { data: blog, error } = await supabase
    .from("blogs")
    .select("content")
    .eq("slug", slug)
    .single();

  if (error || !blog?.content) {
    return new NextResponse("Not found", { status: 404 });
  }

  const cleanText = stripHtml(blog.content).result.replace(/\s+/g, " ").trim();
  const chunks = splitIntoChunks(cleanText);

  /* 3️⃣  Generate audio and cache it */
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const audioChunks: Uint8Array[] = [];

  try {
    for (const part of chunks) {
      const res = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "nova",
        input: part,
        response_format: "mp3",
        stream: true,
        instructions: PERSONALITY_INSTRUCTIONS,
      } as any);

      const reader = (res.body as ReadableStream<Uint8Array>).getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        audioChunks.push(value);
      }
    }

    // Combine all chunks into a single buffer
    const totalLength = audioChunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of audioChunks) {
      combined.set(c, offset);
      offset += c.length;
    }
    const finalBuffer = Buffer.from(combined);

    // Cache for future hits
    await saveAudioToCache(slug, finalBuffer);

    /* 4️⃣  Serve the audio */
    return new NextResponse(finalBuffer, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("TTS generation error", err);
    return new NextResponse("Audio generation failed", { status: 500 });
  }
}
