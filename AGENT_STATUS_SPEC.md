# Agent Status Tab — Build Spec

## Overview
Add an "Agent Status" tab to the existing Next.js dashboard. This tab shows real-time status of ALL configured OpenClaw agents including sub-agents, with context usage, cost tracking, cron jobs, and live updates via SSE.

## Data Sources (READ FROM FILESYSTEM)

### Agent Config
- **File:** `/Users/chenagent/.openclaw/openclaw.json`
- **Structure:** `agents.defaults` (default settings), `agents.list[]` (array of agent configs)
- Each agent has: `id`, `name`, `model` (string or `{primary: string}`), `workspace`, `skills[]`, `contextTokens`, `subagents`

### Session Data (per agent)
- **Pattern:** `/Users/chenagent/.openclaw/agents/{agentId}/sessions/sessions.json`
- **Structure:** JSON object where keys are sessionKeys, values are session entries
- Each session entry has:
  - `totalTokens` (number) — current token usage
  - `contextTokens` (number) — max context window
  - `model` (string) — model used
  - `updatedAt` (number) — Unix timestamp in milliseconds
  - `lastChannel` (string) — telegram, webchat, etc.
  - `lastTo` (string) — delivery target
  - `kind` (string) — session type
- Session keys follow pattern: `agent:{agentId}:main` for main sessions, `agent:{agentId}:subagent:{uuid}` for sub-agents

### Multi-instance agents
- Also check: `/Users/chenagent/.openclaw-agent-2/agents/main/sessions/sessions.json`
- And: `/Users/chenagent/.openclaw-agent-3/agents/main/sessions/sessions.json`
- These are separate gateway instances (agent-2 and agent-3)

### Defaults from config
```json
{
  "contextTokens": 75000,
  "model": { "primary": "anthropic/claude-opus-4-5" },
  "subagents": { "maxConcurrent": 8, "model": "anthropic/claude-sonnet-4-5" }
}
```

## API Endpoints to Create

### GET /api/agents
Returns all agents with their config + session stats merged.

Response shape:
```typescript
interface AgentStatus {
  id: string;
  name: string;
  model: string;
  workspace: string;
  skills: string[];
  contextTokens: number;
  isDefault: boolean;
  subagentConfig?: { allowAgents?: string[]; model?: string; maxConcurrent?: number };
  sessions: {
    key: string;
    totalTokens: number;
    contextTokens: number;
    model: string;
    updatedAt: number; // ms timestamp
    lastChannel: string;
    isSubAgent: boolean;
    cost?: SessionCost;
  }[];
  totalSessions: number;
  activeSessions: number; // active in last 30 min
  lastActive: number | null; // ms timestamp
  status: 'active' | 'idle' | 'never'; // active=<30min, idle=has sessions, never=0 sessions
}
```

### GET /api/agents/stream (SSE endpoint)
Server-Sent Events endpoint that:
- Watches `openclaw.json` and all `sessions.json` files for changes (use `fs.watch` or poll every 5s)
- Sends updated agent data when changes detected
- Client reconnects automatically

### GET /api/cron
Proxy to read cron job data. For now, return empty array (cron data will be added later).

## Cost Tracking
- Each session in sessions.json may have cost data in transcript JSONL files
- For now, estimate costs based on model + token usage:
  - claude-opus-4-5: $15/1M input, $75/1M output (estimate 50/50 split → ~$45/1M total)
  - claude-sonnet-4-5: $3/1M input, $15/1M output (~$9/1M total)
  - ollama/*: $0 (local)
- Show estimated cost per session and per agent total

## UI Design

### Tab Navigation
Add tab bar at the top of the dashboard: `[Task Management] [Agent Status]`
Keep existing task management page intact, add new route.

### Agent Status Page Layout

```
┌─── Filters ──────────────────────────────────────────────────────┐
│ [All (21)] [Active (2)] [Idle (3)] [Never Used (16)]             │
│ [Cloud ☁️] [Local 🖥️]  Search: [____________]                    │
└──────────────────────────────────────────────────────────────────┘

┌─── Summary Cards ────────────────────────────────────────────────┐
│  Total Agents: 21  │  Active Now: 2  │  Total Sessions: 175     │
│  Est. Cost Today: $X.XX  │  Cron Jobs: 0                        │
└──────────────────────────────────────────────────────────────────┘

┌─── Agent Cards (grid) ───────────────────────────────────────────┐
│ ┌─────────────────────────┐  ┌─────────────────────────────────┐ │
│ │ 🟢 Main                 │  │ ⚫ Arbitrage Scanner            │ │
│ │ claude-opus-4-5          │  │ claude-sonnet-4-5               │ │
│ │ ████████████░░░ 92%      │  │ No sessions                    │ │
│ │ 46k / 50k tokens         │  │ Skills: alpaca, quandl, gdelt  │ │
│ │ 159 sessions │ 2m ago    │  │                                │ │
│ │ Est. cost: $2.07         │  │                                │ │
│ │ ▸ Sessions  ▸ Sub-agents │  │                                │ │
│ └─────────────────────────┘  └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Agent Card Details (expanded)
When expanded, show:
- All sessions listed with their token usage, model, last active, channel
- Sub-agent sessions grouped under parent
- Cost breakdown
- Skills as colored tags
- Cron jobs section (if any)

### Styling
- **Dark mode** (match existing dashboard theme)
- Use shadcn/ui components: Card, Badge, Progress, Tabs, Collapsible
- Status colors: 🟢 green = active, 🟡 amber = idle, ⚫ gray = never used
- Model badges: purple for Claude, blue for local/ollama
- Context bar: green < 70%, amber 70-90%, red > 90%

## File Structure
```
src/app/agents/
  page.tsx              — Agent Status page
  components/
    AgentCard.tsx       — Individual agent card
    AgentFilters.tsx    — Filter bar
    SummaryCards.tsx     — Top-level stats
    SessionList.tsx     — Expandable session list
    CostBadge.tsx       — Cost display
src/app/api/agents/
  route.ts              — GET /api/agents
  stream/
    route.ts            — GET /api/agents/stream (SSE)
src/app/api/cron/
  route.ts              — GET /api/cron
src/lib/
  agents.ts             — Agent data reading/parsing logic
  costs.ts              — Cost estimation logic
src/app/layout.tsx      — Update to add tab navigation
```

## Navigation
Update the root layout or add a shared nav component:
- Tab 1: "Tasks" → `/` (existing)
- Tab 2: "Agents" → `/agents` (new)

## Important Notes
- Do NOT modify any existing task management code
- The dashboard is already built with Next.js 16, Prisma 6, Tailwind, shadcn/ui
- Dark mode is already configured
- Read filesystem directly (fs module) — this runs on the same machine
- All file reads should handle missing/corrupt files gracefully
- SSE should debounce updates (don't spam on rapid file changes)
