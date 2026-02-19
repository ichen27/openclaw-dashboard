'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { AgentStatus } from '@/lib/agents';
import { SummaryCards } from './components/SummaryCards';
import { AgentFilters, type StatusFilter, type ModelFilter } from './components/AgentFilters';
import { AgentCard } from './components/AgentCard';
import { Loader2 } from 'lucide-react';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modelFilter, setModelFilter] = useState<ModelFilter>('all');
  const [search, setSearch] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);

  // SSE connection
  useEffect(() => {
    // Initial fetch
    fetch('/api/agents')
      .then(r => r.json())
      .then((data: AgentStatus[]) => {
        setAgents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // SSE for live updates
    function connect() {
      const es = new EventSource('/api/agents/stream');
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AgentStatus[];
          setAgents(data);
          setLoading(false);
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 5s
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const filteredAgents = useMemo(() => {
    let result = agents;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }

    // Model filter
    if (modelFilter === 'cloud') {
      result = result.filter(a => !a.model.startsWith('ollama/'));
    } else if (modelFilter === 'local') {
      result = result.filter(a => a.model.startsWith('ollama/'));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    // Sort: active first, then idle, then never
    const statusOrder = { active: 0, idle: 1, never: 2 };
    return result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [agents, statusFilter, modelFilter, search]);

  const handleStatusFilter = useCallback((f: StatusFilter) => setStatusFilter(f), []);
  const handleModelFilter = useCallback((f: ModelFilter) => setModelFilter(f), []);
  const handleSearch = useCallback((q: string) => setSearch(q), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <SummaryCards agents={agents} />

      <AgentFilters
        agents={agents}
        statusFilter={statusFilter}
        modelFilter={modelFilter}
        search={search}
        onStatusFilter={handleStatusFilter}
        onModelFilter={handleModelFilter}
        onSearch={handleSearch}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAgents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          No agents match your filters.
        </div>
      )}
    </div>
  );
}
