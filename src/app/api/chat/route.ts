import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    const thread = await openai.beta.threads.create();

    const message = await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: question
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

    // Add timeout and retry configuration
    const maxRetries = 10; // 10 retries = up to 3 minutes with 3-second intervals
    let retryCount = 0;

    while (runStatus.status !== 'completed' && retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3 seconds
      runStatus = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );

      if (runStatus.status === 'failed') {
        throw new Error('Run failed');
      }

      retryCount++;
    }

    if (retryCount >= maxRetries) {
      throw new Error('Request timed out after 3 minutes');
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