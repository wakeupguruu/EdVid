import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, ENHANCED_USER, USER1, USER2} from '@/defults/prompt';
import { NextRequest, NextResponse } from 'next/server';
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(req: NextRequest, res: NextResponse){

    try{
        const body = await req.json();
        const userPrompt = body.prompt
        if (!userPrompt) {
            return new Response(JSON.stringify({ error: 'Prompt is required.' }), { status: 400 });
        }
        const PROMPT = ENHANCED_USER(userPrompt);
        const stream = await anthropic.messages.stream({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 3000,
            system: SYSTEM_PROMPT,
            messages: [
              {role: 'user', content: `${USER1}`},
              {role: 'user', content: `${USER2}`},
              { role: 'user', content: `${PROMPT}` },
            ],
            temperature: 1.0,
        });
    let output = '';

    stream.on('text', (text: string) => {
      output += text;
    });

    return new Promise((resolve) => {
      stream.on('end', () => {
        resolve(NextResponse.json({ output }));
      });

      stream.on('error', (err: any) => {
        console.error('Streaming error:', err);
        resolve(NextResponse.json({ error: 'Streaming failed.' }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}