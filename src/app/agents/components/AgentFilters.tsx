'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { AgentStatus } from '@/lib/agents';

export type StatusFilter = 'all' | 'active' | 'idle' | 'never';
export type ModelFilter = 'all' | 'cloud' | 'local';

interface AgentFiltersProps {
  agents: AgentStatus[];
  statusFilter: StatusFilter;
  modelFilter: ModelFilter;
  search: string;
  onStatusFilter: (f: StatusFilter) => void;
  onModelFilter: (f: ModelFilter) => void;
  onSearch: (q: string) => void;
}

export function AgentFilters({
  agents,
  statusFilter,
  modelFilter,
  search,
  onStatusFilter,
  onModelFilter,
  onSearch,
}: AgentFiltersProps) {
  const counts = {
    all: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    idle: agents.filter(a => a.status === 'idle').length,
    never: agents.filter(a => a.status === 'never').length,
  };

  const cloudCount = agents.filter(a => !a.model.startsWith('ollama/')).length;
  const localCount = agents.filter(a => a.model.startsWith('ollama/')).length;

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'active', label: `Active (${counts.active})` },
    { key: 'idle', label: `Idle (${counts.idle})` },
    { key: 'never', label: `Never Used (${counts.never})` },
  ];

  const modelFilters: { key: ModelFilter; label: string }[] = [
    { key: 'all', label: 'All Models' },
    { key: 'cloud', label: `Cloud (${cloudCount})` },
    { key: 'local', label: `Local (${localCount})` },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {statusFilters.map(({ key, label }) => (
          <Badge
            key={key}
            variant={statusFilter === key ? 'default' : 'outline'}
            className="cursor-pointer select-none"
            onClick={() => onStatusFilter(key)}
          >
            {label}
          </Badge>
        ))}
        <span className="mx-1" />
        {modelFilters.map(({ key, label }) => (
          <Badge
            key={key}
            variant={modelFilter === key ? 'default' : 'outline'}
            className="cursor-pointer select-none"
            onClick={() => onModelFilter(key)}
          >
            {label}
          </Badge>
        ))}
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-8 h-8"
        />
      </div>
    </div>
  );
}
