import { NextResponse } from "next/server";

const GATEWAY_URL = "http://localhost:18789";
const GATEWAY_TOKEN = "fdba56046afae2ade86581c3af6c68754afb9b36b8e784cc";

// Claude Opus pricing per 1M tokens
const INPUT_PRICE = 15; // $15 per 1M input tokens
const OUTPUT_PRICE = 75; // $75 per 1M output tokens
const INPUT_RATIO = 0.6;
const OUTPUT_RATIO = 0.4;

interface Session {
  key: string;
  totalTokens?: number;
  [key: string]: unknown;
}

function estimateCost(totalTokens: number): number {
  const inputTokens = totalTokens * INPUT_RATIO;
  const outputTokens = totalTokens * OUTPUT_RATIO;
  return (inputTokens / 1_000_000) * INPUT_PRICE + (outputTokens / 1_000_000) * OUTPUT_PRICE;
}

export async function GET() {
  const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GATEWAY_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tool: "sessions_list",
      input: { kinds: ["agent"], limit: 50 },
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch sessions from gateway" },
      { status: 502 },
    );
  }

  const data = await res.json();
  const sessions: Session[] = data.result?.details?.sessions ?? data.result?.sessions ?? [];

  // Group agent sessions by agent id
  const agentMap = new Map<string, { sessions: number; totalTokens: number }>();

  for (const session of sessions) {
    if (!session.key?.startsWith("agent:")) continue;

    const agentId = session.key.split(":")[1] || session.key;
    const tokens = session.totalTokens ?? 0;

    const existing = agentMap.get(agentId);
    if (existing) {
      existing.sessions++;
      existing.totalTokens += tokens;
    } else {
      agentMap.set(agentId, { sessions: 1, totalTokens: tokens });
    }
  }

  const agents = Array.from(agentMap.entries()).map(([id, data]) => ({
    id,
    sessions: data.sessions,
    totalTokens: data.totalTokens,
    estimatedCost: Math.round(estimateCost(data.totalTokens) * 100) / 100,
  }));

  const totalTokens = agents.reduce((sum, a) => sum + a.totalTokens, 0);
  const totalCost = Math.round(estimateCost(totalTokens) * 100) / 100;

  return NextResponse.json({ agents, totalCost, totalTokens });
}
