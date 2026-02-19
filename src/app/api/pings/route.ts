import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const schedules = await prisma.pingSchedule.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(schedules);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target, message, cronExpr, enabled } = body;

    if (!target?.trim()) {
      return NextResponse.json({ error: "Target is required" }, { status: 400 });
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (!cronExpr?.trim()) {
      return NextResponse.json({ error: "Cron expression is required" }, { status: 400 });
    }

    const schedule = await prisma.pingSchedule.create({
      data: {
        target: target.trim(),
        message: message.trim(),
        cronExpr: cronExpr.trim(),
        enabled: enabled ?? true,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
