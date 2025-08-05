import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, ENHANCED_USER } from '@/defults/prompt';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userPrompt = body.prompt;

    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const PROMPT = ENHANCED_USER(userPrompt);

    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-20250514',
      max_tokens: 20000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `${PROMPT}` },
      ],
      temperature: 1.0,
    }).on('text', (text)=>{
        console.log(text)
    })

    let output = '';

    for await (const message of stream) {
      if (message.type === 'content_block_delta') {
        output += (message.delta as {text : string})?.text || '';
      }
    }

    return NextResponse.json({ output });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
