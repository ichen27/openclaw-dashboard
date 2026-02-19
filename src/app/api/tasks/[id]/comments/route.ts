import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { MentionNotification } from "@/app/api/notifications/route";

// Known agents for @mention resolution
const KNOWN_AGENTS = ["main", "agent-2", "agent-4", "research-agent", "qwen-worker", "llama-8b"];

async function fireMentionNotifications(
  mentions: string[],
  author: string,
  task: { id: string; title: string },
  commentContent: string,
  commentId: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  for (const agentId of mentions) {
    const payload: MentionNotification = {
      mentionedAgentId: agentId,
      fromAuthor: author,
      taskId: task.id,
      taskTitle: task.title,
      commentContent,
      commentId,
    };

    // Fire-and-forget — don't block comment creation
    fetch(`${baseUrl}/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(e => console.error("Notification dispatch failed:", e));
  }
}

function extractMentions(content: string): string[] {
  const matches = content.match(/@([\w-]+)/g) ?? [];
  return matches
    .map(m => m.slice(1))
    .filter(name => KNOWN_AGENTS.includes(name));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const comments = await prisma.comment.findMany({
    where: { taskId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    comments.map(c => ({
      ...c,
      mentions: JSON.parse(c.mentions ?? "[]") as string[],
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  try {
    const body = await request.json();
    const { content, author } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const mentions = extractMentions(content);

    const finalAuthor = author?.trim() || "human";

    const comment = await prisma.comment.create({
      data: {
        taskId: id,
        content: content.trim(),
        author: finalAuthor,
        mentions: JSON.stringify(mentions),
      },
    });

    // Fire notifications for any @mentioned agents (non-blocking)
    if (mentions.length > 0) {
      fireMentionNotifications(
        mentions,
        finalAuthor,
        { id, title: task.title },
        content.trim(),
        comment.id
      );
    }

    return NextResponse.json({
      ...comment,
      mentions,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const { searchParams } = request.nextUrl;
  const commentId = searchParams.get("commentId");

  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.taskId !== taskId) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
