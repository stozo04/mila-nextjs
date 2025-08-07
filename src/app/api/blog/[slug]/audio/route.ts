// src/app/api/blog/[slug]/audio/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import { stripHtml } from "string-strip-html";
import { PassThrough } from "stream";

// Alexis Rose personality block
const PERSONALITY_INSTRUCTIONS = `
You are Alexis Rose from Schitt's Creek:
– A fabulously over-the-top Canadian socialite turned town insider
– Warm, melodramatic with that signature Canadian lilt
– Drawn-out vowels on fun words ("fuuun", "fabuuulous")
– Boutique-babble ("vintage vibe", "artisan aesthetic")
– Occasional French-flavored "oui, oui"
– Every moment is a VIP event—dramatic encouragement, self-awareness, endlessly charming
`;

// Function to split text into chunks respecting sentence boundaries
function splitIntoChunks(text: string, maxChunkSize: number): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = "";
  
  // Split by sentences (periods, exclamation marks, question marks)
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit
    if (currentChunk.length + sentence.length > maxChunkSize) {
      // If current chunk is not empty, add it to chunks
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      
      // If a single sentence is too long, split it by words
      if (sentence.length > maxChunkSize) {
        const words = sentence.split(/\s+/);
        let wordChunk = "";
        
        for (const word of words) {
          if (wordChunk.length + word.length + 1 > maxChunkSize) {
            if (wordChunk.trim()) {
              chunks.push(wordChunk.trim());
              wordChunk = "";
            }
          }
          wordChunk += (wordChunk ? " " : "") + word;
        }
        
        if (wordChunk.trim()) {
          currentChunk = wordChunk;
        }
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    stream.on('error', (error) => {
      reject(error);
    });
  });
}

// Check for a cached audio blob
async function getAudioFromCache(slug: string): Promise<Buffer | null> {
  const { data, error } = await supabase
    .from("blog_audio")
    .select("audio_data")
    .eq("slug", slug)
    .single();
  if (error || !data?.audio_data) return null;
  return Buffer.from(data.audio_data, "base64");
}

// Save a newly generated audio blob
async function saveAudioToCache(slug: string, buffer: Buffer) {
  const base64Audio = buffer.toString("base64");
  const { error } = await supabase.from("blog_audio").upsert({
    slug,
    audio_data: base64Audio,
    created_at: new Date().toISOString(),
  });
  if (error) console.error("Error saving audio cache:", error);
}

export async function GET(
  request: NextRequest,
  { params }
): Promise<NextResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    const { slug } = await params;
    if (!slug) {
      return new NextResponse("Missing slug", { status: 400 });
    }

    // 1) Return cached audio if present
    const cached = await getAudioFromCache(slug);

    if (cached) {
      return new NextResponse(cached, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": cached.length.toString(),
        },
      });
    }

    // 2) Fetch blog text & clean HTML
    const { data: blog, error: blogErr } = await supabase
      .from("blogs")
      .select("content")
      .eq("slug", slug)
      .single();
    if (blogErr || !blog?.content) {
      return new NextResponse("Blog not found", { status: 404 });
    }
    const clean = stripHtml(blog.content).result.replace(/\s+/g, " ").trim();
gates
    // 3) Split into chunks if too long (respecting sentence boundaries)
    const MAX_CHUNK_SIZE = 3800; // Leave buffer for TTS model limits
    const chunks = splitIntoChunks(clean, MAX_CHUNK_SIZE);

    // 4) Generate audio for each chunk and concatenate
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const audioBuffers: Buffer[] = [];

    console.log(`Generating audio for ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} characters)`);
      
      const aiRes = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "nova",
        input: chunk,
        instructions: PERSONALITY_INSTRUCTIONS.trim(),
        response_format: "mp3",
      });

      if (!aiRes.body) {
        throw new Error(`No body from OpenAI for chunk ${i + 1}`);
      }

      // Convert the stream to buffer
      const chunkBuffer = await streamToBuffer(aiRes.body as unknown as NodeJS.ReadableStream);
      audioBuffers.push(chunkBuffer);
    }

    // 5) Concatenate all audio buffers
    const fullAudio = Buffer.concat(audioBuffers);
    
    // 6) Cache the concatenated audio
    await saveAudioToCache(slug, fullAudio);

    // 7) Return the concatenated audio
    return new NextResponse(fullAudio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fullAudio.length.toString(),
      },
    });
  } catch (err) {
    console.error("Error in TTS route:", err);
    return new NextResponse("Error generating audio", { status: 500 });
  }
}
