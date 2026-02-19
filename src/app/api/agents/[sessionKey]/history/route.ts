import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  toolCalls?: any[];
}

// Map agent IDs to their session directories
const AGENT_SESSION_DIRS: Record<string, string> = {
  'main': '/Users/chenagent/.openclaw-agent-2/agents/main/sessions',
  'agent-1': '/Users/chenagent/.openclaw/agents/main/sessions',
  'agent-3': '/Users/chenagent/.openclaw-agent-3/agents/main/sessions',
};

function parseJsonl(filePath: string, limit: number = 10): Message[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    
    const messages: Message[] = [];
    
    // Take last N lines (most recent)
    const recentLines = lines.slice(-limit * 2); // *2 to account for tool results
    
    for (const line of recentLines) {
      try {
        const entry = JSON.parse(line);
        
        if (entry.role === 'user' || entry.role === 'assistant') {
          const msg: Message = {
            role: entry.role,
            content: typeof entry.content === 'string' 
              ? entry.content 
              : JSON.stringify(entry.content).slice(0, 500),
            timestamp: entry.timestamp,
          };
          
          if (entry.tool_calls && entry.tool_calls.length > 0) {
            msg.toolCalls = entry.tool_calls.map((tc: any) => ({
              name: tc.function?.name || tc.name || 'unknown',
              args: tc.function?.arguments || tc.arguments,
            }));
          }
          
          messages.push(msg);
        }
      } catch {
        // Skip malformed lines
      }
    }
    
    return messages.slice(-limit);
  } catch {
    return [];
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionKey: string }> }
) {
  try {
    const { sessionKey } = await params;
    
    // Try to find the session file in known directories
    for (const [agentId, sessionsDir] of Object.entries(AGENT_SESSION_DIRS)) {
      const sessionFile = path.join(sessionsDir, `${sessionKey}.jsonl`);
      
      if (fs.existsSync(sessionFile)) {
        const messages = parseJsonl(sessionFile, 10);
        return NextResponse.json(messages);
      }
    }
    
    // Session not found
    return NextResponse.json([]);
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json([]);
  }
}
