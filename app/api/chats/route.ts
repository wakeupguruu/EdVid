import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Next_Auth } from '@/lib/auth';
import { ExtendedUser } from '@/lib/auth';
import { PrismaClient } from '@/db/generated/prisma';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Get all chat sessions for the user
    const chatSessions = await prisma.prompt.groupBy({
      by: ['chatSessionId'],
      where: {
        userId: user.id,
        chatSessionId: { not: null },
      },
      _count: {
        id: true, // Count of prompts in each session
      },
      _max: {
        createdAt: true, // Latest prompt in each session
      },
      _min: {
        createdAt: true, // First prompt in each session
      },
      orderBy: {
        _max: {
          createdAt: 'desc', // Most recent sessions first
        },
      },
    });

    // Get the first prompt (title) and last prompt for each session
    const chatHistory = await Promise.all(
      chatSessions.map(async (session) => {
        const firstPrompt = await prisma.prompt.findFirst({
          where: {
            userId: user.id,
            chatSessionId: session.chatSessionId,
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            inputText: true,
            title: true,
            status: true,
          },
        });

        const lastPrompt = await prisma.prompt.findFirst({
          where: {
            userId: user.id,
            chatSessionId: session.chatSessionId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            inputText: true,
            status: true,
            video: {
              select: {
                id: true,
                status: true,
                title: true,
              },
            },
          },
        });

        return {
          chatSessionId: session.chatSessionId,
          title: firstPrompt?.title || firstPrompt?.inputText || 'Untitled Chat',
          firstPromptId: firstPrompt?.id,
          lastPromptId: lastPrompt?.id,
          promptCount: session._count.id,
          createdAt: session._min.createdAt,
          updatedAt: session._max.createdAt,
          status: lastPrompt?.status,
          videoStatus: lastPrompt?.video?.status,
          videoTitle: lastPrompt?.video?.title,
        };
      })
    );

    return NextResponse.json({ chatHistory });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    // Create a new chat session
    const chatSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({ 
      chatSessionId,
      title,
      message: 'New chat session created successfully.'
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json({ error: 'Failed to create chat session.' }, { status: 500 });
  }
}
