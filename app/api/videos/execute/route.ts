import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/db/generated/prisma';
import { getServerSession } from 'next-auth';
import { Next_Auth } from '@/lib/auth';
import { ExtendedUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const prisma = new PrismaClient();

/**
 * Simple endpoint to execute Manim code on VM
 * 
 * Steps:
 * 1. Get Python code from database
 * 2. Save it to a temp file
 * 3. SSH to VM and run: python execute_manim.py <videoId> <code_file>
 * 4. Done! VM will update database with webhook
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(Next_Auth);
    const user = session?.user as ExtendedUser;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: 'videoId required' }, { status: 400 });
    }

    // Get video and code from database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        prompt: { include: { codeSnippet: true } }
      }
    });

    if (!video || video.prompt.userId !== user.id) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.prompt.codeSnippet) {
      return NextResponse.json({ error: 'No code to execute' }, { status: 400 });
    }

    const pythonCode = video.prompt.codeSnippet.code;

    // Create temp file with Python code
    const tempDir = os.tmpdir();
    const codeFile = path.join(tempDir, `code_${videoId}.py`);
    
    fs.writeFileSync(codeFile, pythonCode);
    logger.info(`Saved code to: ${codeFile}`);

    // Get VM details from environment
    const VM_HOST = process.env.VM_HOST || 'localhost';
    const VM_USER = process.env.VM_USER || 'user';
    const VM_KEY = process.env.VM_KEY_PATH || '/path/to/key.pem';
    const MANIM_DIR = process.env.MANIM_DIR || '/path/to/Manim';

    try {
      // Copy file to VM using SCP
      logger.info(`Copying code to VM: ${VM_HOST}`);
      
      const scpCommand = `scp -i ${VM_KEY} ${codeFile} ${VM_USER}@${VM_HOST}:${MANIM_DIR}/code_${videoId}.py`;
      execSync(scpCommand, { stdio: 'inherit' });

      logger.info('Code copied to VM');

      // SSH and execute the Python script
      logger.info('Executing Manim on VM...');
      
      const sshCommand = `ssh -i ${VM_KEY} ${VM_USER}@${VM_HOST} "cd ${MANIM_DIR} && python execute_manim.py ${videoId} code_${videoId}.py"`;
      execSync(sshCommand, { stdio: 'inherit' });

      // Clean up local temp file
      fs.unlinkSync(codeFile);

      return NextResponse.json({
        success: true,
        message: 'Manim execution started on VM'
      });

    } catch (error) {
      logger.error('VM execution error', { error: String(error) });

      // Update video status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'failed',
          errorMessage: String(error)
        }
      });

      return NextResponse.json(
        { error: 'Failed to execute on VM', details: String(error) },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Execute endpoint error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
