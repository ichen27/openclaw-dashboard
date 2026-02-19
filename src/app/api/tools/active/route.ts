import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface ActiveTool {
  type: 'exec' | 'browser' | 'other';
  sessionId: string;
  pid?: number;
  command?: string;
  status: 'running' | 'waiting';
  startTime?: number;
}

export async function GET() {
  try {
    const activeTools: ActiveTool[] = [];
    
    // Check for active processes (simplified - in real implementation would query OpenClaw)
    try {
      const { stdout } = await execAsync('ps aux | grep -E "(claude|node|next)" | grep -v grep | head -20');
      const lines = stdout.trim().split('\n').filter(Boolean);
      
      for (const line of lines) {
        const match = line.match(/\s+(\d+)\s+.*?(\S+)$/);
        if (match) {
          const [, pid, command] = match;
          activeTools.push({
            type: 'exec',
            sessionId: `proc-${pid}`,
            pid: parseInt(pid),
            command: command.slice(0, 100),
            status: 'running',
            startTime: Date.now() - Math.random() * 600000, // Mock start time
          });
        }
      }
    } catch {
      // Process list failed, skip
    }
    
    return NextResponse.json(activeTools.slice(0, 10));
  } catch (error) {
    console.error('Active tools error:', error);
    return NextResponse.json([]);
  }
}
