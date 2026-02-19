# OpenClaw Dashboard — Documentation

## Overview

The OpenClaw Dashboard is a Next.js 16 web app for managing tasks and monitoring agents across multiple OpenClaw instances. It provides a Kanban board for task management, real-time agent monitoring, and analytics.

**Stack:** Next.js 16.1.6 · Prisma 6 · SQLite · shadcn/ui · Tailwind CSS  
**URL:** http://localhost:3000  
**Service:** `com.openclaw.dashboard` (launchd)

---

## Pages

### Tasks (`/`)
- **Kanban board** with columns: backlog → queued → in-progress → review → done → failed
- **Category tabs** — filter by project category
- **Task filters** — search, priority, status, assignee
- **New Task dialog** — create tasks with category, priority, description
- **Decompose dialog** — break a task into subtasks with bulk paste support
- **Keyboard shortcuts** — `n` (new task), `/` (search), `?` (help)

### Agents (`/agents`)
- **Real-time agent monitoring** via SSE (Server-Sent Events)
- **Instance sections** — grouped by OpenClaw instance (agent-1, agent-2, etc.)
- **Agent cards** — model, status, sessions, cost
- **Summary header** — total agents, active count, cost overview
- **Metrics panel** — token usage, context utilization, health bars
- **Collaboration graph** — visual agent relationships
- **Activity timeline** — recent agent events
- **Active tools** — live running processes
- **Message agent** — send messages to agent sessions
- **Quick Actions** — gateway status/restart, context token config

### Analytics (`/analytics`)
- **Summary cards** — total tasks, avg velocity, completions, active agents
- **Throughput chart** — created vs completed per day (bar chart)
- **Status distribution** — color-coded progress bars
- **Activity heatmap** — hour × day-of-week (UTC)
- **Agent leaderboard** — ranked by event count
- **Status transitions** — most common status flow paths
- **Priority breakdown** — task distribution by priority
- **Activity timeline** — chronological event log with auto-refresh

---

## API Reference

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (query: `category`, `status`, `priority`, `assignedAgent`) |
| POST | `/api/tasks` | Create task (`categoryId`/`categorySlug`, `title`, `description`, `requirements`, `priority`, `status`, `dueDate`) |
| GET | `/api/tasks/[id]` | Get single task |
| PATCH | `/api/tasks/[id]` | Update task fields |
| DELETE | `/api/tasks/[id]` | Delete task |
| POST | `/api/tasks/bulk` | Bulk create tasks (body: `{ tasks: [...] }`, max 100) |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories ordered by `order` asc (includes task count) |
| POST | `/api/categories` | Create category (`name`, `slug?`, `color?`, `icon?`, `order?`) — auto-generates slug from name if omitted |
| GET | `/api/categories/[id]` | Get single category (includes task count) |
| PATCH | `/api/categories/[id]` | Update category fields (`name`, `slug`, `color`, `icon`, `order`) |
| DELETE | `/api/categories/[id]` | Delete category (cascades to tasks) |
| PUT | `/api/categories/reorder` | Reorder categories (`{ orderedIds: [...] }`) |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents from all instances |
| GET | `/api/agents/stream` | SSE stream of agent updates |
| GET | `/api/agents/[sessionKey]/history` | Get session transcript |
| POST | `/api/agents/send` | Send message to agent session |
| GET | `/api/agents/actions?instance=X` | Read agent config |
| POST | `/api/agents/actions` | Execute actions (gateway-status, gateway-restart, update-context-tokens, clear-sessions) |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics?days=N` | Aggregated analytics (velocity, status, agents, heatmap, flow) |
| GET | `/api/analytics/timeline?hours=N&limit=N` | Recent task events with details |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cron` | List cron jobs |
| GET | `/api/tools/active` | List running processes/tools |
| GET | `/api/today` | Daily focus: work queue, in-progress, recently done, category stats |
| GET | `/api/tasks/export?format=csv\|json` | Export all tasks (optional: `?status=X&category=slug`) |
| PATCH | `/api/tasks/bulk` | Bulk update: `{ ids: [...], status?, priority?, assignedAgent? }` |
| GET | `/api/tasks/[id]/comments` | List comments for a task |
| POST | `/api/tasks/[id]/comments` | Create comment `{ content, author }` — auto-detects @mentions |
| DELETE | `/api/tasks/[id]/comments?commentId=X` | Delete a comment |
| GET | `/api/tasks/[id]/dependencies` | Get `{ blockedBy: Task[], blocking: Task[] }` |
| POST | `/api/tasks/[id]/dependencies` | Add blocked-by: `{ blockedById }` — validates no cycles |
| DELETE | `/api/tasks/[id]/dependencies?blockedById=X` | Remove dependency |
| GET | `/api/knowledge/search?q=...&types=tasks,memory,categories` | Full-text search across tasks + memory files |
| GET | `/api/knowledge/graph` | Knowledge graph nodes + edges for visualization |
| POST | `/api/notifications` | Fire @mention notification to agent session |
| GET | `/api/notifications` | List notifiable agents with active sessions |

---

## Database Schema

### Category
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Display name |
| slug | String (unique) | URL-safe identifier |
| color | String | Hex color code |
| icon | String | Lucide icon name |

### Task
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| categoryId | String | FK to Category |
| title | String | Task title |
| description | String | Detailed description |
| requirements | String | Acceptance criteria |
| status | String | backlog/queued/in-progress/review/done/failed |
| priority | String | low/medium/high |
| assignedAgent | String? | Agent ID |
| dueDate | DateTime? | Optional deadline |

### TaskEvent
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| taskId | String | FK to Task |
| fromStatus | String? | Previous status (null = creation) |
| toStatus | String | New status |
| agent | String? | Agent that made the change |
| note | String | Optional note |
| createdAt | DateTime | When the event occurred |

### Comment (added Feb 17)
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| taskId | String | FK to Task |
| author | String | Author name (agent id or "human") |
| content | String | Comment text |
| mentions | String | JSON array of @mentioned agent ids |
| createdAt/updatedAt | DateTime | Timestamps |

### TaskDependency (added Feb 17)
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| taskId | String | The blocked task |
| blockedById | String | The blocking task |
| @@unique([taskId, blockedById]) | | Prevents duplicates |

---

## CLI Tools

### taskctl
Global CLI for task management from the terminal.

```bash
taskctl list                          # List all tasks
taskctl list --status backlog         # Filter by status
taskctl list --priority high          # Filter by priority
taskctl create --title "Fix bug" --categorySlug coding-tasks
taskctl update <id> --status done     # Update status
taskctl update <id> --priority high   # Update priority
taskctl delete <id>                   # Delete task
```

### taskctl-tui
Terminal UI with Kanban board and vim keybindings.

```bash
taskctl-tui                           # Launch TUI
DASHBOARD_URL=http://host:3000 taskctl-tui  # Custom URL
```

**Keys:** `hjkl` navigate, `H/L` move tasks, `p` cycle priority, `r` refresh, `Enter` detail, `1/2/3` filter, `q` quit

### task-batch
Bulk task creation from JSON files.

```bash
task-batch create tasks.json          # Create from JSON
task-batch create tasks.json --dry-run  # Preview only
```

### task-templates
Task template library for common patterns.

```bash
task-templates list                   # List available templates
task-templates preview feature        # Preview a template
task-templates use feature --prefix "Auth" --priority high
```

---

## Development

```bash
cd ~/.openclaw-agent-2/workspace/openclaw-dashboard

# Install deps
npm install

# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Dev server
npm run dev -- --port 3001

# Build & restart production
npm run build
launchctl kickstart -k gui/$(id -u)/com.openclaw.dashboard
```

### Database
- SQLite at `prisma/dev.db`
- Prisma Studio: `npx prisma studio`

### Adding new features
1. Create API route in `src/app/api/`
2. Create component in `src/components/` or `src/app/<page>/components/`
3. Wire into page
4. Build & restart

---

## Architecture

```
openclaw-dashboard/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── dev.db                 # SQLite database
├── src/
│   ├── app/
│   │   ├── page.tsx           # Tasks page (Dashboard)
│   │   ├── agents/            # Agents monitoring page
│   │   │   ├── page.tsx
│   │   │   └── components/    # Agent-specific components
│   │   ├── analytics/         # Analytics page
│   │   │   └── page.tsx
│   │   └── api/               # API routes
│   │       ├── tasks/         # CRUD + bulk
│   │       ├── agents/        # Status, stream, send, actions
│   │       ├── analytics/     # Stats + timeline
│   │       ├── cron/          # Cron jobs
│   │       └── tools/         # Active processes
│   ├── components/            # Shared components
│   │   ├── ui/                # shadcn primitives
│   │   ├── kanban-board.tsx
│   │   ├── analytics-dashboard.tsx
│   │   ├── activity-timeline.tsx
│   │   ├── decompose-dialog.tsx
│   │   └── ...
│   └── lib/
│       ├── prisma.ts          # Prisma client
│       ├── agents.ts          # Agent config reader
│       ├── costs.ts           # Cost estimation
│       ├── constants.ts       # Statuses, priorities
│       └── utils.ts           # Helpers
└── package.json
```
