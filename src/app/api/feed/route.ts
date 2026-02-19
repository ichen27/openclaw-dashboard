import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getAllAgents } from "@/lib/agents";

const execAsync = promisify(exec);

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
  try {
    const body = await request.json();
    const { author, content, type, parentId, pinned } = body;

    if (!author?.trim()) {
      return NextResponse.json({ error: "Author is required" }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const validTypes = ["post", "request", "status", "comment"];
    const postType = type && validTypes.includes(type) ? type : "post";

    // Parse @mentions from content
    const mentionRegex = /@(agent-[1-4]|ivan|main)/g;
    const mentionMatches = content.match(mentionRegex) ?? [];
    const mentions = [...new Set(mentionMatches.map((m: string) => m.slice(1)))]; // remove @ prefix, dedupe

    const post = await prisma.feedPost.create({
      data: {
        author: author.trim(),
        content: content.trim(),
        type: postType,
        mentions: JSON.stringify(mentions),
        pinned: pinned ?? false,
        parentId: parentId ?? null,
      },
    });

    // Fire notifications to mentioned agents (non-blocking)
    if (mentions.length > 0) {
      const excerpt = content.trim().length > 100
        ? content.trim().slice(0, 97) + "…"
        : content.trim();

      for (const mentioned of mentions) {
        // Don't notify yourself
        if (mentioned === author.trim()) continue;

        try {
          const agents = getAllAgents();
          const agent = agents.find((a) => a.id === mentioned);
          if (!agent || !agent.sessions.length) continue;

          const sorted = [...agent.sessions].sort(
            (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
          );
          const sessionKey = sorted[0]?.key;
          if (!sessionKey) continue;

          const message = `📢 Feed mention from ${author.trim()}: "${excerpt}" — Check the dashboard feed at /feed`;
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
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
