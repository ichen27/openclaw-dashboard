import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { prisma } from "@/lib/prisma";

// Agent config paths
const AGENT_CONFIGS = [
  { id: "agent-1", configPath: "/Users/chenagent/.openclaw/openclaw.json" },
  { id: "agent-2", configPath: "/Users/chenagent/.openclaw-agent-2/openclaw.json" },
  { id: "agent-3", configPath: "/Users/chenagent/.openclaw-agent-3/openclaw.json" },
  { id: "agent-4", configPath: "/Users/chenagent/.openclaw-agent-4/openclaw.json" },
];

function loadGateways() {
  return AGENT_CONFIGS.map((agent) => {
    try {
      const config = JSON.parse(readFileSync(agent.configPath, "utf-8"));
      return {
        id: agent.id,
        port: config?.gateway?.port ?? 0,
        token: config?.gateway?.auth?.token ?? "",
      };
    } catch {
      return { id: agent.id, port: 0, token: "" };
    }
  }).filter((g) => g.port > 0 && g.token);
}

let gatewayCache: ReturnType<typeof loadGateways> | null = null;
let cacheTime = 0;

function getGateways() {
  const now = Date.now();
  if (!gatewayCache || now - cacheTime > 30000) {
    gatewayCache = loadGateways();
    cacheTime = now;
  }
  return gatewayCache;
}

type Gateway = { id: string; port: number; token: string };

interface ChatMsg {
  id: string;
  agent: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  source?: "gateway" | "local";
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

async function fetchAgentHistory(
  gateway: Gateway,
  limit: number
): Promise<ChatMsg[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`http://127.0.0.1:${gateway.port}/tools/invoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gateway.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool: "sessions_history",
        args: { sessionKey: "agent:main:main", limit, includeTools: false },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.ok) return [];

    const text = data.result?.content?.[0]?.text;
    if (!text) return [];

    let msgs = JSON.parse(text);
    if (msgs && typeof msgs === "object" && "messages" in msgs)
      msgs = msgs.messages;
    if (!Array.isArray(msgs)) return [];

    return msgs
      .filter(
        (m: { role: string; content: string | Array<{ type: string; text?: string }> }) => {
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
        ) => ({
          id: `gw-${gateway.id}-${m.timestamp || i}`,
          agent: gateway.id,
          role: m.role as "user" | "assistant",
          content: extractText(m.content),
          timestamp: m.timestamp || 0,
          model: m.model,
          source: "gateway" as const,
        })
      );
  } catch {
    return [];
  }
}

async function fetchAgentStatus(gateway: Gateway) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`http://127.0.0.1:${gateway.port}/tools/invoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gateway.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool: "sessions_list",
        args: { limit: 1, messageLimit: 0 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { online: false };
    const data = await res.json();
    if (!data.ok) return { online: false };

    const sessions = data.result?.details?.sessions;
    if (!sessions?.length) return { online: true };

    const s = sessions[0];
    return {
      online: true,
      model: s.model as string | undefined,
      channel: s.channel as string | undefined,
      tokens: s.totalTokens as number | undefined,
    };
  } catch {
    return { online: false };
  }
}

// GET /api/chat
export async function GET(req: NextRequest) {
  const agentFilter = req.nextUrl.searchParams.get("agent");
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") || "30"),
    100
  );
  const statusOnly = req.nextUrl.searchParams.get("status") === "true";
  const GATEWAYS = getGateways();

  if (statusOnly) {
    // Also include offline agents from config
    const allAgentIds = AGENT_CONFIGS.map((a) => a.id);
    const statuses = await Promise.all(
      allAgentIds.map(async (id) => {
        const gw = GATEWAYS.find((g) => g.id === id);
        if (!gw) return { id, online: false };
        return { id, ...(await fetchAgentStatus(gw)) };
      })
    );
    return NextResponse.json({ agents: statuses });
  }

  // Fetch from gateways
  const gateways = agentFilter
    ? GATEWAYS.filter((g) => g.id === agentFilter)
    : GATEWAYS;

  const gatewayMsgs = (
    await Promise.all(gateways.map((gw) => fetchAgentHistory(gw, limit)))
  ).flat();

  // Fetch locally stored messages (sent from dashboard)
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
    source: "local" as const,
  }));

  // Merge and deduplicate (prefer gateway messages, supplement with local)
  const allMsgs = [...gatewayMsgs, ...localFormatted];

  // Deduplicate: if a local message content matches a gateway message within 30s, skip local
  const deduplicated = allMsgs.filter((msg, _idx) => {
    if (msg.source !== "local") return true;
    // Check if gateway has a similar message
    const hasDupe = gatewayMsgs.some(
      (gw) =>
        gw.agent === msg.agent &&
        gw.content === msg.content &&
        Math.abs(gw.timestamp - msg.timestamp) < 30000
    );
    return !hasDupe;
  });

  deduplicated.sort((a, b) => a.timestamp - b.timestamp);

  return NextResponse.json({ messages: deduplicated });
}

// POST /api/chat — send message + store locally
export async function POST(req: NextRequest) {
  const { agent, message } = await req.json();

  if (!agent || !message) {
    return NextResponse.json(
      { error: "agent and message required" },
      { status: 400 }
    );
  }

  const gw = getGateways().find((g) => g.id === agent);
  if (!gw) {
    return NextResponse.json({ error: "Agent offline or unknown" }, { status: 404 });
  }

  // Store in local DB first so it shows up immediately
  const stored = await prisma.chatMessage.create({
    data: {
      agent,
      role: "user",
      content: message,
      sender: "ivan",
      timestamp: new Date(),
    },
  });

  // Send via gateway
  try {
    const res = await fetch(`http://127.0.0.1:${gw.port}/tools/invoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gw.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool: "cron",
        args: { action: "wake", text: message, mode: "now" },
      }),
    });

    if (!res.ok) {
      // Fallback: one-shot cron
      await fetch(`http://127.0.0.1:${gw.port}/tools/invoke`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gw.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool: "cron",
          args: {
            action: "add",
            job: {
              name: `dashboard-msg-${Date.now()}`,
              schedule: {
                kind: "at",
                at: new Date(Date.now() + 3000).toISOString(),
              },
              payload: { kind: "systemEvent", text: message },
              sessionTarget: "main",
            },
          },
        }),
      });
      return NextResponse.json({
        sent: true,
        method: "cron-fallback",
        messageId: stored.id,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      sent: true,
      method: "wake",
      messageId: stored.id,
      data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to send to gateway", messageId: stored.id, detail: String(err) },
      { status: 500 }
    );
  }
}
