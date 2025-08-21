import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, ENHANCED_USER } from '@/defults/prompt';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/db/generated/prisma';
import { getServerSession } from 'next-auth';
import { Next_Auth } from '@/lib/auth';
import { ExtendedUser } from '@/lib/auth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }


    const body = await req.json();
    const userPrompt = body.prompt;

    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }



    const prompt = await prisma.prompt.create({
      data: {
        inputText: userPrompt,
        userId: user.id,
        status: 'pending',
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        promptId: prompt.id,
        action: "prompt_created",
        metadata: {promptText: userPrompt}
      }
    })



    
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

    await prisma.prompt.update({
      where:{id : prompt.id},
      data:{
        rawOutput: output,
        status: 'processing',
        startedProcessingAt: new Date()
      }
    })

    const scenes = JSON.parse(output);
    const codeSnippet = await prisma.codeSnippet.create({
      data: {
        promptId: prompt.id,
        code: scenes.map((s: any) => s.code).join('\n\n'),
        language: "python"
      }
    });

    const video = await prisma.video.create({
      data: {
        promptId: prompt.id,
        status: "queued",
        title: scenes[0]?.scene || "Generated Video"
      }
    });

    await prisma.videoProcessingLog.create({
      data: {
        videoId: video.id,
        stage: "queued",
        message: "Video added to processing queue",
        level: "info"
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        promptId: prompt.id,
        action: "video_queued",
        metadata: { videoId: video.id, sceneCount: scenes.length }
      }
    })
    
  
    return NextResponse.json({ 
      success: true,
      promptId: prompt.id,
      videoId: video.id,
      sceneCount: scenes.length
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// console.log('afs,dfjbklsdbf')