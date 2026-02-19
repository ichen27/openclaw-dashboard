import { NextResponse } from 'next/server';
import { getAllAgents } from '@/lib/agents';

export const dynamic = 'force-dynamic';

export async function GET() {
  const agents = getAllAgents();
  return NextResponse.json(agents);
}
