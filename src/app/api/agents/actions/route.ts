import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

const CONFIG_PATHS: Record<string, string> = {
  'agent-1': '/Users/chenagent/.openclaw/openclaw.json',
  'agent-2': '/Users/chenagent/.openclaw-agent-2/openclaw.json',
  'agent-3': '/Users/chenagent/.openclaw-agent-3/openclaw.json',
  'agent-4': '/Users/chenagent/.openclaw-agent-4/openclaw.json',
};

// GET: Read agent config details
export async function GET(request: Request) {
  const url = new URL(request.url);
  const instanceId = url.searchParams.get('instance');

  if (!instanceId || !CONFIG_PATHS[instanceId]) {
    return NextResponse.json({ error: 'Invalid instance' }, { status: 400 });
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATHS[instanceId], 'utf-8');
    const config = JSON.parse(raw);

    // Return safe subset
    const agents = (config.agents?.list || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      model: typeof a.model === 'string' ? a.model : a.model?.primary,
      contextTokens: a.contextTokens ?? config.agents?.defaults?.contextTokens,
      skills: a.skills || [],
      heartbeat: a.heartbeat,
    }));

    const defaults = {
      model: config.agents?.defaults?.model?.primary,
      contextTokens: config.agents?.defaults?.contextTokens,
    };

    return NextResponse.json({ instance: instanceId, agents, defaults });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Execute agent actions
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, instance, agentId, value } = body;

    if (!instance || !CONFIG_PATHS[instance]) {
      return NextResponse.json({ error: 'Invalid instance' }, { status: 400 });
    }

    const configPath = CONFIG_PATHS[instance];
    const homeDir = configPath.replace('/openclaw.json', '');

    switch (action) {
      case 'gateway-status': {
        try {
          const { stdout } = await execAsync(`cd ${homeDir} && openclaw gateway status 2>&1`, { timeout: 10000 });
          return NextResponse.json({ success: true, output: stdout.trim() });
        } catch (e: any) {
          return NextResponse.json({ success: false, output: e.stderr || e.message });
        }
      }

      case 'gateway-restart': {
        try {
          const { stdout } = await execAsync(`cd ${homeDir} && openclaw gateway restart 2>&1`, { timeout: 15000 });
          return NextResponse.json({ success: true, output: stdout.trim() });
        } catch (e: any) {
          return NextResponse.json({ success: false, output: e.stderr || e.message });
        }
      }

      case 'update-context-tokens': {
        if (!agentId || !value) {
          return NextResponse.json({ error: 'agentId and value required' }, { status: 400 });
        }
        const tokens = parseInt(value, 10);
        if (isNaN(tokens) || tokens < 10000 || tokens > 200000) {
          return NextResponse.json({ error: 'Tokens must be 10000-200000' }, { status: 400 });
        }

        try {
          const raw = fs.readFileSync(configPath, 'utf-8');
          const config = JSON.parse(raw);
          const agent = config.agents?.list?.find((a: any) => a.id === agentId);
          if (!agent) {
            return NextResponse.json({ error: 'Agent not found in config' }, { status: 404 });
          }
          agent.contextTokens = tokens;
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          return NextResponse.json({ success: true, output: `${agentId} contextTokens → ${tokens}` });
        } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 500 });
        }
      }

      case 'clear-sessions': {
        if (!agentId) {
          return NextResponse.json({ error: 'agentId required' }, { status: 400 });
        }
        // Find and clean up session files
        const sessionDir = `${homeDir}/agents/${agentId}/sessions`;
        try {
          if (fs.existsSync(sessionDir)) {
            const sessionsFile = `${sessionDir}/sessions.json`;
            if (fs.existsSync(sessionsFile)) {
              const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
              const count = Object.keys(data).length;
              // Don't actually delete - just report
              return NextResponse.json({ 
                success: true, 
                output: `Found ${count} sessions for ${agentId}. Use gateway restart to clean stale sessions.` 
              });
            }
          }
          return NextResponse.json({ success: true, output: 'No sessions found' });
        } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 500 });
        }
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
