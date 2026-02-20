import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getAllAgents } from "@/lib/agents";

const execAsync = promisify(exec);
const VALID_TYPES = new Set(["post", "request", "status", "comment"]);

type FeedPostInput = {
  author: string;
  content: string;
  type: string;
  parentId: string | null;
  pinned: boolean;
};

function parseFeedPostBody(body: unknown):
  | { ok: true; value: FeedPostInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const { author, content, type, parentId, pinned } = body as Record<string, unknown>;

  if (typeof author !== "string" || !author.trim()) {
    return { ok: false, error: "Author is required" };
  }

  if (typeof content !== "string" || !content.trim()) {
    return { ok: false, error: "Content is required" };
  }

  if (type !== undefined && typeof type !== "string") {
    return { ok: false, error: "type must be a string" };
  }

  if (parentId !== undefined && parentId !== null && typeof parentId !== "string") {
    return { ok: false, error: "parentId must be a string or null" };
  }

  if (pinned !== undefined && typeof pinned !== "boolean") {
    return { ok: false, error: "pinned must be a boolean" };
  }

  return {
    ok: true,
    value: {
      author: author.trim(),
      content: content.trim(),
      type: type && VALID_TYPES.has(type) ? type : "post",
      parentId: parentId ?? null,
      pinned: pinned ?? false,
    },
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const author = searchParams.get("author");
  const type = searchParams.get("type");
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  const where: Record<string, unknown> = {
    parentId: null, // only top-level posts
  };
  if (author) where.author = author;
  if (type && type !== "all") where.type = type;

  const posts = await prisma.feedPost.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  // Get reply counts
  const postIds = posts.slice(0, limit).map((p) => p.id);
  const replyCounts = await prisma.feedPost.groupBy({
    by: ["parentId"],
    where: { parentId: { in: postIds } },
    _count: { id: true },
  });
  const replyCountMap: Record<string, number> = {};
  for (const rc of replyCounts) {
    if (rc.parentId) replyCountMap[rc.parentId] = rc._count.id;
  }

  const hasMore = posts.length > limit;
  const items = posts.slice(0, limit).map((p) => ({
    ...p,
    replyCount: replyCountMap[p.id] ?? 0,
  }));

  return NextResponse.json({
    posts: items,
    hasMore,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Invalid JSON body", detail }, { status: 400 });
  }

  const parsed = parseFeedPostBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { author, content, type, parentId, pinned } = parsed.value;

  try {
    // Parse @mentions from content
    const mentionRegex = /@(agent-[1-4]|ivan|main)/g;
    const mentionMatches = content.match(mentionRegex) ?? [];
    const mentions = [...new Set(mentionMatches.map((m: string) => m.slice(1)))]; // remove @ prefix, dedupe

    const post = await prisma.feedPost.create({
      data: {
        author,
        content,
        type,
        mentions: JSON.stringify(mentions),
        pinned,
        parentId,
      },
    });

    // Fire notifications to mentioned agents (non-blocking)
    if (mentions.length > 0) {
      const excerpt = content.length > 100
        ? content.slice(0, 97) + "…"
        : content;

      const agents = getAllAgents();

      for (const mentioned of mentions) {
        // Don't notify yourself
        if (mentioned === author) continue;

        try {
          const agent = agents.find((a) => a.id === mentioned);
          if (!agent || !agent.sessions.length) continue;

          const sorted = [...agent.sessions].sort(
            (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
          );
          const sessionKey = sorted[0]?.key;
          if (!sessionKey) continue;

          const message = `📢 Feed mention from ${author}: "${excerpt}" — Check the dashboard feed at /feed`;
          const safeMessage = message.replace(/"/g, '\\"').replace(/\n/g, " ");
          const command = `openclaw send --session "${sessionKey}" --message "${safeMessage}" --timeout 15`;

          // Fire and forget — don't block post creation
          execAsync(command, { timeout: 20000 }).catch((err) => {
            console.error(`Feed mention notification error for ${mentioned}:`, err);
          });
        } catch (err) {
          console.error(`Feed mention notification error for ${mentioned}:`, err);
        }
      }
    }

    return NextResponse.json(post, { status: 201 });
  } catch (err: unknown) {
    console.error("Feed POST create error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create feed post", detail }, { status: 500 });
  }
}
