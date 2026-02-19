import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GATEWAY_URL = "http://localhost:18789";
const GATEWAY_TOKEN = "fdba56046afae2ade86581c3af6c68754afb9b36b8e784cc";
const AGENTS = ["agent-1", "agent-2", "agent-3", "agent-4"];

interface ChatMsg {
  id: string;
  agent: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  source?: "gateway" | "dashboard" | "inter-agent";
}

function extractText(
  content: string | Array<{ type: string; text?: string }>
): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join("\n");
  }
  return "";
}

function isInterAgentContent(text: string): boolean {
  return (
    text.includes("[Inter-session message]") ||
    text.includes("sourceSession")
  );
}

async function fetchAgentHistory(
  agentId: string,
  limit: number
): Promise<ChatMsg[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `${GATEWAY_URL}/sessions/agent:${agentId}:main/history?limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${GATEWAY_TOKEN}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();

    let msgs = Array.isArray(data)
      ? data
      : data.messages ?? data.history ?? [];
    if (!Array.isArray(msgs)) return [];

    return msgs
      .filter(
        (m: {
          role: string;
          content: string | Array<{ type: string; text?: string }>;
        }) => {
          if (m.role !== "user" && m.role !== "assistant") return false;
          const txt = extractText(m.content);
          if (!txt.trim()) return false;
          if (txt === "HEARTBEAT_OK" || txt === "NO_REPLY") return false;
          if (txt.startsWith("Read HEARTBEAT.md")) return false;
          return true;
        }
      )
      .map(
        (
          m: {
            role: string;
            content: string | Array<{ type: string; text?: string }>;
            timestamp?: number;
            model?: string;
          },
          i: number
        ) => {
          const text = extractText(m.content);
          const isInterAgent =
            m.role === "user" && isInterAgentContent(text);
          return {
            id: `gw-${agentId}-${m.timestamp || Date.now() - i}`,
            agent: agentId,
            role: m.role as "user" | "assistant",
            content: text,
            timestamp: m.timestamp || 0,
            model: m.model,
            source: isInterAgent
              ? ("inter-agent" as const)
              : ("gateway" as const),
          };
        }
      );
  } catch {
    return [];
  }
}

async function fetchAgentStatuses(): Promise<
  Array<{ id: string; online: boolean; model?: string }>
> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${GATEWAY_URL}/sessions`, {
      headers: { Authorization: `Bearer ${GATEWAY_TOKEN}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return AGENTS.map((id) => ({ id, online: false }));
    }

    const data = await res.json();
    const sessions: Array<{ session_id?: string; status?: string }> =
      Array.isArray(data) ? data : data.sessions ?? [];

    return AGENTS.map((id) => {
      const sessionKey = `agent:${id}:main`;
      const session = sessions.find(
        (s) => s.session_id === sessionKey || s.session_id === id
      );
      return {
        id,
        online: !!session && session.status !== "disconnected",
      };
    });
  } catch {
    return AGENTS.map((id) => ({ id, online: false }));
  }
}

// Mark inter-agent user messages that weren't sent from the dashboard
async function markInterAgentMessages(
  gatewayMsgs: ChatMsg[],
  agentId?: string
): Promise<ChatMsg[]> {
  const userMsgs = gatewayMsgs.filter(
    (m) => m.role === "user" && m.source !== "inter-agent"
  );
  if (userMsgs.length === 0) return gatewayMsgs;

  const where: Record<string, unknown> = { role: "user" };
  if (agentId) where.agent = agentId;

  const localMsgs = await prisma.chatMessage.findMany({
    where,
    select: { agent: true, content: true, timestamp: true },
  });

  return gatewayMsgs.map((msg) => {
    if (msg.role !== "user" || msg.source === "inter-agent") return msg;
    const isLocal = localMsgs.some(
      (lm) =>
        lm.agent === msg.agent &&
        lm.content === msg.content &&
        Math.abs(lm.timestamp.getTime() - msg.timestamp) < 60000
    );
    return {
      ...msg,
      source: isLocal ? ("dashboard" as const) : ("inter-agent" as const),
    };
  });
}

// GET /api/chat
export async function GET(req: NextRequest) {
  const agentFilter = req.nextUrl.searchParams.get("agent");
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") || "30"),
    100
  );
  const statusOnly = req.nextUrl.searchParams.get("status") === "true";

  if (statusOnly) {
    const statuses = await fetchAgentStatuses();
    return NextResponse.json({ agents: statuses });
  }

  const agentIds = agentFilter ? [agentFilter] : AGENTS;

  const gatewayMsgs = (
    await Promise.all(agentIds.map((id) => fetchAgentHistory(id, limit)))
  ).flat();

  const annotatedMsgs = await markInterAgentMessages(
    gatewayMsgs,
    agentFilter ?? undefined
  );

  const where: Record<string, unknown> = {};
  if (agentFilter) where.agent = agentFilter;

  const localMsgs = await prisma.chatMessage.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  const localFormatted: ChatMsg[] = localMsgs.map((m) => ({
    id: `local-${m.id}`,
    agent: m.agent,
    role: m.role as "user" | "assistant",
    content: m.content,
    timestamp: m.timestamp.getTime(),
    source: "dashboard" as const,
  }));

  const allMsgs = [...annotatedMsgs, ...localFormatted];
  const deduplicated = allMsgs.filter((msg) => {
    if (msg.id.startsWith("local-")) {
      return !annotatedMsgs.some(
        (gw) =>
          gw.agent === msg.agent &&
          gw.content === msg.content &&
          Math.abs(gw.timestamp - msg.timestamp) < 60000
      );
    }
    return true;
  });

  deduplicated.sort((a, b) => a.timestamp - b.timestamp);

  return NextResponse.json({ messages: deduplicated });
}

// POST /api/chat — send message via gateway REST + store locally
export async function POST(req: NextRequest) {
  const { agent, message } = await req.json();

  if (!agent || !message) {
    return NextResponse.json(
      { error: "agent and message required" },
      { status: 400 }
    );
  }

  const stored = await prisma.chatMessage.create({
    data: {
      agent,
      role: "user",
      content: message,
      sender: "ivan",
      timestamp: new Date(),
    },
  });

  try {
    const res = await fetch(
      `${GATEWAY_URL}/sessions/agent:${agent}:main/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GATEWAY_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error");
      return NextResponse.json(
        {
          error: "Gateway rejected message",
          messageId: stored.id,
          detail: errText,
        },
        { status: 502 }
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ sent: true, messageId: stored.id, data });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to send to gateway",
        messageId: stored.id,
        detail: String(err),
      },
      { status: 500 }
    );
  }
}
