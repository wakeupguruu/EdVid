import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/db/generated/prisma';
import { getServerSession } from 'next-auth';
import { Next_Auth } from '@/lib/auth';
import { ExtendedUser } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const chatId = params.chatId;

    // Get the root prompt and verify ownership
    const rootPrompt = await prisma.prompt.findFirst({
      where: {
        id: chatId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!rootPrompt) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }

    // Get all prompts in this chat session (the chain)
    const allPrompts: any[] = [];
    let currentPrompt: any = rootPrompt;

    while (currentPrompt) {
      // Fetch the prompt with its video data
      const promptWithVideo = await prisma.prompt.findUnique({
        where: { id: currentPrompt.id },
        include: { video: true },
      });
      
      if (promptWithVideo) {
        allPrompts.push(promptWithVideo);
      }
      
      // Find the next prompt in the chain
      const nextPrompt = await prisma.prompt.findFirst({
        where: {
          previousPromptId: currentPrompt.id,
          userId: user.id,
          deletedAt: null,
        },
      });
      
      currentPrompt = nextPrompt;
    }

    // Convert prompts to messages format
    const messages = allPrompts.map((prompt, index) => {
      // Parse scene count from content
      let sceneCount = 0;
      try {
        if (prompt.content) {
          const scenes = JSON.parse(prompt.content);
          sceneCount = Array.isArray(scenes) ? scenes.length : 0;
        }
      } catch (e) {
        console.error('Error parsing prompt content for scene count:', e);
      }

      return {
        id: prompt.id,
        role: 'user' as const,
        content: prompt.inputText,
        timestamp: prompt.createdAt,
        videoData: prompt.video ? {
          videoId: prompt.video.id,
          promptId: prompt.id,
          sceneCount: sceneCount,
          status: prompt.video.status,
          isContinuation: index > 0,
          previousPromptId: prompt.previousPromptId,
        } : undefined,
      };
    });

    // Add assistant responses
    const assistantMessages = allPrompts.map((prompt, index) => {
      if (prompt.status === 'completed' && prompt.content) {
        try {
          const scenes = JSON.parse(prompt.content);
          return {
            id: `${prompt.id}_assistant`,
            role: 'assistant' as const,
            content: index === 0 
              ? `Perfect! I've created a comprehensive educational video with ${scenes.length} scenes covering your topic. Here's your video:`
              : `Perfect! I've extended your video with ${scenes.length} additional scenes. Here's your enhanced video:`,
            timestamp: prompt.completedAt || prompt.updatedAt,
            videoData: {
              videoId: prompt.video?.id || `video_${prompt.id}`,
              promptId: prompt.id,
              sceneCount: scenes.length,
              status: 'completed',
              isContinuation: index > 0,
              previousPromptId: prompt.previousPromptId,
            },
          };
        } catch (e) {
          return {
            id: `${prompt.id}_assistant`,
            role: 'assistant' as const,
            content: 'Video generation completed.',
            timestamp: prompt.completedAt || prompt.updatedAt,
            videoData: {
              videoId: prompt.video?.id || `video_${prompt.id}`,
              promptId: prompt.id,
              sceneCount: 0,
              status: 'completed',
              isContinuation: index > 0,
              previousPromptId: prompt.previousPromptId,
            },
          };
        }
      }
      return null;
    }).filter(Boolean);

    // Interleave user and assistant messages
    const allMessages = [];
    for (let i = 0; i < messages.length; i++) {
      allMessages.push(messages[i]);
      if (assistantMessages[i]) {
        allMessages.push(assistantMessages[i]);
      }
    }

    return NextResponse.json({
      success: true,
      chatId,
      messages: allMessages,
      lastPromptId: allPrompts[allPrompts.length - 1]?.id,
    });

  } catch (error) {
    console.error('Error fetching chat session:', error);
    return NextResponse.json({ error: 'Failed to fetch chat session.' }, { status: 500 });
  }
}