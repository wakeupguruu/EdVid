import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Next_Auth } from '@/lib/auth';
import { ExtendedUser } from '@/lib/auth';
import { PrismaClient } from '@/db/generated/prisma';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { chatSessionId: string } }
) {
  try {
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { chatSessionId } = params;

    // Get all prompts in this chat session
    const prompts = await prisma.prompt.findMany({
      where: {
        userId: user.id,
        chatSessionId: chatSessionId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        video: {
          select: {
            id: true,
            status: true,
            title: true,
          },
        },
      },
    });

    // Convert prompts to chat messages format
    const messages = prompts.map((prompt) => ({
      id: prompt.id,
      role: 'user' as const,
      content: prompt.inputText,
      timestamp: prompt.createdAt,
      videoData: prompt.video ? {
        videoId: prompt.video.id,
        promptId: prompt.id,
        sceneCount: 0, // We'll need to parse this from content
        status: prompt.video.status,
        isContinuation: !!prompt.previousPromptId,
        previousPromptId: prompt.previousPromptId,
      } : undefined,
    }));

    // Add assistant responses (we'll need to create these from the video data)
    const assistantMessages = prompts
      .filter(prompt => prompt.video)
      .map((prompt) => ({
        id: `assistant_${prompt.id}`,
        role: 'assistant' as const,
        content: `Perfect! I've created a comprehensive educational video with scenes covering your topic. Here's your video:`,
        timestamp: prompt.completedAt || prompt.createdAt,
        videoData: {
          videoId: prompt.video!.id,
          promptId: prompt.id,
          sceneCount: prompt.content ? JSON.parse(prompt.content).length : 0,
          status: prompt.video!.status,
          isContinuation: !!prompt.previousPromptId,
          previousPromptId: prompt.previousPromptId,
        },
      }));

    // Merge and sort all messages
    const allMessages = [...messages, ...assistantMessages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return NextResponse.json({ 
      chatSessionId,
      messages: allMessages,
      title: prompts[0]?.title || prompts[0]?.inputText || 'Untitled Chat',
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch chat messages.' }, { status: 500 });
  }
}
