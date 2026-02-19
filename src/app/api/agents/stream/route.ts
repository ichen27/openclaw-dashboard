import { getAllAgents, getWatchPaths } from '@/lib/agents';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial data
      const agents = getAllAgents();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(agents)}\n\n`));

      // Debounce mechanism
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const watchers: fs.FSWatcher[] = [];

      function sendUpdate() {
        try {
          const freshAgents = getAllAgents();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(freshAgents)}\n\n`));
        } catch {
          // Client disconnected or encoding error, will be cleaned up
        }
      }

      function debouncedSend() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(sendUpdate, 2000);
      }

      // Watch config and session files
      const paths = getWatchPaths();
      for (const filePath of paths) {
        try {
          const watcher = fs.watch(filePath, { persistent: false }, () => {
            debouncedSend();
          });
          watchers.push(watcher);
        } catch {
          // File may not exist yet
        }
      }

      // Also poll every 10s as a fallback for files that don't support fs.watch
      const pollInterval = setInterval(() => {
        sendUpdate();
      }, 10000);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Connection closed
        }
      }, 30000);

      // Cleanup on cancel
      const cleanup = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        clearInterval(pollInterval);
        clearInterval(heartbeat);
        for (const w of watchers) {
          try { w.close(); } catch { /* ignore */ }
        }
      };

      // Store cleanup for cancel
      (controller as unknown as { _cleanup: () => void })._cleanup = cleanup;
    },

    cancel(controller) {
      const cleanup = (controller as unknown as { _cleanup?: () => void })?._cleanup;
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
