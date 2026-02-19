import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { enabled, message, cronExpr, target } = body;

    const data: Record<string, unknown> = {};
    if (enabled !== undefined) data.enabled = enabled;
    if (message !== undefined) data.message = message;
    if (cronExpr !== undefined) data.cronExpr = cronExpr;
    if (target !== undefined) data.target = target;

    const schedule = await prisma.pingSchedule.update({
      where: { id },
      data,
    });

    return NextResponse.json(schedule);
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
    await prisma.pingSchedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
