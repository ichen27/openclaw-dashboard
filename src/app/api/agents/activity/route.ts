import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface ActivityEntry {
  agent: string;
  timestamp: string;
  text: string;
  type: 'task' | 'event' | 'session' | 'heartbeat' | 'note';
  source: 'memory' | 'session' | 'heartbeat';
}

const WORKSPACE_MAP: Record<string, string> = {
  '/Users/chenagent/.openclaw/workspace': 'agent-1',
  '/Users/chenagent/.openclaw-agent-2/workspace': 'agent-2',
  '/Users/chenagent/.openclaw-agent-3/workspace': 'agent-3',
  '/Users/chenagent/.openclaw/workspace-agent4': 'agent-4',
};

function readMemoryFiles(): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  const today = new Date();
  const dates = [0, 1, 2].map(days => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  });

  for (const [workspace, agentId] of Object.entries(WORKSPACE_MAP)) {
    for (const date of dates) {
      const memoryPath = path.join(workspace, 'memory', `${date}.md`);
      try {
        const content = fs.readFileSync(memoryPath, 'utf-8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Match timestamp patterns like "## 14:32 - " or "### 14:32 "
          const timeMatch = line.match(/^#{2,3}\s*(\d{1,2}:\d{2})\s*[-–]\s*(.+)/);
          if (timeMatch) {
            const [, time, text] = timeMatch;
            const timestamp = `${date.slice(5)} ${time}`;
            
            // Determine type based on content
            let type: ActivityEntry['type'] = 'note';
            if (text.toLowerCase().includes('task') || text.toLowerCase().includes('complete')) {
              type = 'task';
            } else if (text.toLowerCase().includes('session') || text.toLowerCase().includes('build')) {
              type = 'session';
            } else if (text.toLowerCase().includes('heartbeat') || text.toLowerCase().includes('check')) {
              type = 'heartbeat';
            }
            
            entries.push({
              agent: agentId,
              timestamp,
              text: text.trim(),
              type,
              source: 'memory',
            });
          }
        }
      } catch {
        // File doesn't exist, skip
      }
    }
  }

  return entries;
}

function getRecentSessions(): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  for (const [workspace, agentId] of Object.entries(WORKSPACE_MAP)) {
    const sessionsDir = path.join(workspace.replace('/workspace', ''), 'agents/main/sessions');
    try {
      const sessionsPath = path.join(sessionsDir, 'sessions.json');
      const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
      
      for (const [key, session] of Object.entries(sessions) as [string, any][]) {
        const updatedAt = session.updatedAt || 0;
        if (updatedAt > oneHourAgo) {
          const date = new Date(updatedAt);
          const timestamp = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          
          entries.push({
            agent: agentId,
            timestamp,
            text: `Active session: ${session.lastChannel || 'unknown channel'}`,
            type: 'session',
            source: 'session',
          });
        }
      }
    } catch {
      // Sessions file doesn't exist
    }
  }

  return entries;
}

export async function GET() {
  try {
    const memoryEntries = readMemoryFiles();
    const sessionEntries = getRecentSessions();
    
    const allEntries = [...memoryEntries, ...sessionEntries]
      .sort((a, b) => {
        // Simple timestamp comparison (assumes MM-DD HH:MM format)
        return b.timestamp.localeCompare(a.timestamp);
      })
      .slice(0, 50);

    return NextResponse.json(allEntries);
  } catch (error) {
    console.error('Activity feed error:', error);
    return NextResponse.json([]);
  }
}
