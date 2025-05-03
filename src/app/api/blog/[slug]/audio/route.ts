import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';
import { stripHtml } from 'string-strip-html';

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

// Function to check if we have this audio cached
async function getAudioFromCache(slug: string) {
  try {
    const { data, error } = await supabase
      .from('blog_audio')
      .select('audio_data')
      .eq('slug', slug)
      .single();
    
    if (error || !data || !data.audio_data) {
      return null;
    }
    
    // Convert base64 string back to buffer
    const buffer = Buffer.from(data.audio_data, 'base64');
    return buffer;
  } catch (err) {
    console.error('Error checking audio cache:', err);
    return null;
  }
}

// Function to save audio to cache
async function saveAudioToCache(slug: string, buffer: Buffer) {
  try {
    // Convert buffer to base64 string for storage
    const base64Audio = buffer.toString('base64');
    
    const { error } = await supabase
      .from('blog_audio')
      .upsert({ 
        slug, 
        audio_data: base64Audio,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error saving audio to cache:', error);
    }
  } catch (err) {
    console.error('Error in saveAudioToCache:', err);
  }
}

export async function GET(
  request: NextRequest,
  { params }
): Promise<NextResponse> {
  try {

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    
    const { slug } = await params;
    
    // First, check if we have this audio cached
    const cachedAudio = await getAudioFromCache(slug);
    if (cachedAudio) {
      console.log(`Serving cached audio for ${slug}`);
      return new NextResponse(cachedAudio, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cachedAudio.length.toString()
        }
      });
    }
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Fetch & clean your blog text
    const { data: blog, error } = await supabase
      .from('blogs')
      .select('content')
      .eq('slug', slug)
      .single();
      
    if (error || !blog) {
      return new NextResponse('Blog not found', { status: 404 });
    }
    
    const cleanText = stripHtml(blog.content).result.trim();
    
    // Check if text is short enough for direct processing
    // GPT-4o-mini-tts has a character limit, so we'll use a safe threshold
    const MAX_TEXT_LENGTH = 4000; // Characters (not tokens)
    
    if (cleanText.length > MAX_TEXT_LENGTH) {
      // For longer content, we'll truncate to avoid timeout
      // This is a temporary solution until we implement a proper background job
      const truncatedText = cleanText.substring(0, MAX_TEXT_LENGTH) + 
        "... [Content truncated due to length. Please visit the blog to read the full content.]";
        
      const mp3 = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'nova',
        input: truncatedText,
        instructions: PERSONALITY_INSTRUCTIONS.trim(),
        response_format: 'mp3'
      });
      
      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      // Cache the result for future requests
      await saveAudioToCache(slug, buffer);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': buffer.length.toString()
        }
      });
    } else {
      // Regular processing for shorter content
      const mp3 = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'nova',
        input: cleanText,
        instructions: PERSONALITY_INSTRUCTIONS.trim(),
        response_format: 'mp3'
      });
      
      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      // Cache the result for future requests
      await saveAudioToCache(slug, buffer);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': buffer.length.toString()
        }
      });
    }
  } catch (err) {
    console.error('Error generating audio:', err);
    return new NextResponse('Error generating audio', { status: 500 });
  }
}