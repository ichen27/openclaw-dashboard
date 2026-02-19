import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GW_PORT = 18790;
const GW_TOKEN = process.env.OPENCLAW_GW_TOKEN || '1781b3468f023cd4162bc58f830ef69162c548a9becc5b7c';

export async function POST(request: Request) {
  try {
    const { sessionKey, message } = await request.json();

    if (!sessionKey || !message) {
      return NextResponse.json(
        { error: 'sessionKey and message required' },
        { status: 400 }
      );
    }

    // Use the OpenClaw gateway cron wake API to inject a system event
    // This is the most reliable way to reach an agent session
    const res = await fetch(`http://127.0.0.1:${GW_PORT}/api/cron/wake`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GW_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
        mode: 'now',
        sessionKey: sessionKey,
      }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ success: true, output: JSON.stringify(data), sessionKey });
    }

    // Fallback: try system event injection via cron one-shot
    const cronRes = await fetch(`http://127.0.0.1:${GW_PORT}/api/cron`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GW_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job: {
          name: `Ping to ${sessionKey}`,
          schedule: { kind: 'at', at: new Date().toISOString() },
          sessionTarget: 'main',
          payload: { kind: 'systemEvent', text: message },
          enabled: true,
        },
      }),
    });

    if (cronRes.ok) {
      const cronData = await cronRes.json().catch(() => ({}));
      return NextResponse.json({ success: true, output: 'Scheduled via cron', sessionKey, cronData });
    }

    return NextResponse.json({
      success: false,
      error: `Gateway returned ${res.status} / ${cronRes.status}`,
    }, { status: 502 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Agent send error:', msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
