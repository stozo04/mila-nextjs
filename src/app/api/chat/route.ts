import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const POLL_INTERVAL_MS = 3000;
const START_TIME = Date.now();

// Get the current date as a string in your desired format.
const currentDate = new Date().toLocaleDateString('en-US', {
  timeZone: 'UTC', // or your desired time zone
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});


// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Using service role key for server-side operations
);

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    
    // Store the question in Supabase
    const { error: insertError } = await supabase
      .from('chat_questions')
      .insert([
        { 
          question,
          created_at: new Date().toISOString(),
        }
      ]);

    if (insertError) {
      console.error('Error storing question:', insertError);
      // Continue with the chat even if storing fails
    }

    const thread = await openai.beta.threads.create();

    // Combine the current date with the user's question.
    const questionWithDate = `Assume today's date is ${currentDate}. ${question}`;

    const message = await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: questionWithDate
      }
    );


    // Create and await the run
    const run = await openai.beta.threads.runs.create(
      thread.id,
      {
        assistant_id: process.env.OPENAI_ASSISTANT_ID || '',
      }
    );

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(
      thread.id,
      run.id
    );

    while (runStatus.status !== 'completed') {
      // Check if timeout has been exceeded
      if (Date.now() - START_TIME > TIMEOUT_MS) {
        console.error('Request timed out after 3 minutes');
        throw new Error('Request timed out after 3 minutes');
      }
      
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('Run status: ', runStatus);
      if (runStatus.status === 'failed') {
        throw new Error('Run failed');
      }
    }
    
    // Get the messages
    const messages = await openai.beta.threads.messages.list(
      thread.id
    );

    // Get the last assistant message
    const lastMessage = messages.data
      .filter(message => message.role === 'assistant')
      .pop();

    if (!lastMessage) {
      throw new Error('No response from assistant');
    }

    // Extract the text content
    const answer = lastMessage.content[0].type === 'text' 
      ? lastMessage.content[0].text.value 
      : 'No text response available';

    return NextResponse.json({ answer });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "An error occurred while processing your request",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}