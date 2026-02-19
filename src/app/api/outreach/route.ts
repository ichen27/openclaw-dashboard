import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const STATUSES = ["pending", "replied", "call_scheduled", "referred", "no_response", "declined"];

export async function GET() {
  const outreach = await prisma.outreach.findMany({
    orderBy: { sentAt: "desc" },
  });
  return NextResponse.json(outreach);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company, contactName, contactRole, linkedinUrl, status, notes, sentAt } = body;

    if (!company?.trim() || !contactName?.trim()) {
      return NextResponse.json({ error: "company and contactName are required" }, { status: 400 });
    }

    const record = await prisma.outreach.create({
      data: {
        company: company.trim(),
        contactName: contactName.trim(),
        contactRole: contactRole || "",
        linkedinUrl: linkedinUrl || "",
        status: STATUSES.includes(status) ? status : "pending",
        notes: notes || "",
        sentAt: sentAt ? new Date(sentAt) : new Date(),
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error("POST /api/outreach error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
