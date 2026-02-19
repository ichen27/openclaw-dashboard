import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const post = await prisma.feedPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const replies = await prisma.feedPost.findMany({
    where: { parentId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ post, replies });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { content, pinned, type } = body;

    const data: Record<string, unknown> = {};
    if (content !== undefined) data.content = content;
    if (pinned !== undefined) data.pinned = pinned;
    if (type !== undefined) data.type = type;

    const post = await prisma.feedPost.update({
      where: { id },
      data,
    });

    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Not found or invalid body" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Delete replies first
    await prisma.feedPost.deleteMany({ where: { parentId: id } });
    await prisma.feedPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
