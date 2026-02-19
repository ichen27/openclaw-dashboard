import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getAllAgents } from '@/lib/agents';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export interface MentionNotification {
  mentionedAgentId: string;
  fromAuthor: string;
  taskId: string;
  taskTitle: string;
  commentContent: string;
  commentId: string;
}

// Map agent id → most recent active session key
function getSessionForAgent(agentId: string): string | null {
  const agents = getAllAgents();
  const agent = agents.find(a => a.id === agentId);
  if (!agent || !agent.sessions.length) return null;

  // Pick most recently active session
  const sorted = [...agent.sessions].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  return sorted[0]?.key ?? null;
}

// POST /api/notifications
// Fires an OpenClaw session message to a mentioned agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MentionNotification;
    const { mentionedAgentId, fromAuthor, taskTitle, commentContent } = body;

    if (!mentionedAgentId || !taskTitle || !commentContent) {
      return NextResponse.json({ error: 'mentionedAgentId, taskTitle, commentContent required' }, { status: 400 });
    }

    const sessionKey = getSessionForAgent(mentionedAgentId);

    if (!sessionKey) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: `No active session found for agent ${mentionedAgentId}`,
      });
    }

    const excerpt = commentContent.length > 100
      ? commentContent.slice(0, 97) + '…'
      : commentContent;

    const message = `💬 @mention from ${fromAuthor} on task "${taskTitle}": "${excerpt}" — Check the dashboard for context.`;

    const safeMessage = message.replace(/"/g, '\\"').replace(/\n/g, ' ');
    const command = `openclaw send --session "${sessionKey}" --message "${safeMessage}" --timeout 15`;

    const { stdout, stderr } = await execAsync(command, { timeout: 20000 });

    if (stderr) console.error('Notification send error:', stderr);

    return NextResponse.json({
      success: true,
      agentId: mentionedAgentId,
      sessionKey,
      output: stdout.trim(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Notification error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// GET /api/notifications — health check / list available agents for notifications
export async function GET() {
  const agents = getAllAgents();
  const notifiable = agents
    .filter(a => a.sessions.length > 0)
    .map(a => ({
      id: a.id,
      status: a.status,
      sessionCount: a.totalSessions,
      latestSession: [...a.sessions]
        .sort((x, y) => (y.updatedAt ?? 0) - (x.updatedAt ?? 0))[0]?.key ?? null,
    }));

  return NextResponse.json({ agents: notifiable });
}
