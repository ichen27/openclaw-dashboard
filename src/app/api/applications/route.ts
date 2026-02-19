import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const STAGES = [
  "not_applied",
  "applied",
  "phone_screen",
  "technical",
  "final_round",
  "offer",
  "rejected",
  "withdrawn",
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stage = searchParams.get("stage");

  const where: Record<string, unknown> = {};
  if (stage) where.stage = stage;

  const applications = await prisma.application.findMany({
    where,
    orderBy: [{ priority: "asc" }, { company: "asc" }],
  });

  return NextResponse.json(applications);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company, role, url, stage, priority, notes, taskId, nextAction, appliedAt, interviewDate, offerDeadline } = body;

    if (!company?.trim()) {
      return NextResponse.json({ error: "Company is required" }, { status: 400 });
    }
    if (!role?.trim()) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    const app = await prisma.application.create({
      data: {
        company: company.trim(),
        role: role.trim(),
        url: url || "",
        stage: STAGES.includes(stage) ? stage : "not_applied",
        priority: priority || "high",
        notes: notes || "",
        taskId: taskId || null,
        nextAction: nextAction || "",
        appliedAt: appliedAt ? new Date(appliedAt) : null,
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        offerDeadline: offerDeadline ? new Date(offerDeadline) : null,
      },
    });

    return NextResponse.json(app, { status: 201 });
  } catch (err) {
    console.error("POST /api/applications error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
