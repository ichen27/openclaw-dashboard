'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Brain, FileText, FolderOpen, CheckSquare, Loader2, X } from 'lucide-react';
import type { KnowledgeNode, KnowledgeEdge } from '@/app/api/knowledge/graph/route';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  type: 'task' | 'memory' | 'category';
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  score: number;
  meta?: Record<string, string | null>;
}

interface GraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    taskCount: number;
    categoryCount: number;
    agentCount: number;
    statusBreakdown: Record<string, number>;
  };
}

// ─── SVG Graph ───────────────────────────────────────────────────────────────

const W = 900;
const H = 560;
const PADDING = 60;

function useForceLayout(nodes: KnowledgeNode[], edges: KnowledgeEdge[]) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!nodes.length) return;

    // Initialize positions in a circle
    const pos: Record<string, { x: number; y: number; vx: number; vy: number }> = {};
    const cx = W / 2;
    const cy = H / 2;

    // Place categories in outer ring, tasks in inner cluster
    const catNodes = nodes.filter(n => n.type === 'category');
    const agentNodes = nodes.filter(n => n.type === 'agent');
    const taskNodes = nodes.filter(n => n.type === 'task');

    catNodes.forEach((n, i) => {
      const angle = (i / catNodes.length) * 2 * Math.PI;
      const r = 180;
      pos[n.id] = { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, vx: 0, vy: 0 };
    });

    agentNodes.forEach((n, i) => {
      const angle = (i / Math.max(agentNodes.length, 1)) * 2 * Math.PI + Math.PI / 4;
      const r = 100;
      pos[n.id] = { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, vx: 0, vy: 0 };
    });

    taskNodes.forEach((n, i) => {
      const angle = (i / taskNodes.length) * 2 * Math.PI;
      const r = 60 + Math.random() * 100;
      pos[n.id] = {
        x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 40,
        y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0,
      };
    });

    // Build edge index
    const edgeMap: Record<string, string[]> = {};
    for (const e of edges) {
      (edgeMap[e.source] ??= []).push(e.target);
      (edgeMap[e.target] ??= []).push(e.source);
    }

    // Run force simulation
    const STEPS = 120;
    const REPULSION = 3000;
    const ATTRACTION = 0.04;
    const DAMPING = 0.82;

    for (let step = 0; step < STEPS; step++) {
      const nodeList = Object.keys(pos);

      // Repulsion
      for (let i = 0; i < nodeList.length; i++) {
        for (let j = i + 1; j < nodeList.length; j++) {
          const a = pos[nodeList[i]];
          const b = pos[nodeList[j]];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }

      // Attraction along edges
      for (const e of edges) {
        const a = pos[e.source];
        const b = pos[e.target];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const targetLen = e.weight === 2 ? 120 : 80;
        const stretch = dist - targetLen;
        const force = ATTRACTION * stretch;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Center gravity
      for (const id of nodeList) {
        const p = pos[id];
        p.vx += (cx - p.x) * 0.004;
        p.vy += (cy - p.y) * 0.004;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;
        // Boundary
        p.x = Math.max(PADDING, Math.min(W - PADDING, p.x));
        p.y = Math.max(PADDING, Math.min(H - PADDING, p.y));
      }
    }

    setPositions(Object.fromEntries(Object.entries(pos).map(([id, p]) => [id, { x: p.x, y: p.y }])));
  }, [nodes, edges]);

  return positions;
}

function KnowledgeGraphSVG({
  graphData,
  focused,
  onFocus,
}: {
  graphData: GraphData;
  focused: string | null;
  onFocus: (id: string | null) => void;
}) {
  const positions = useForceLayout(graphData.nodes, graphData.edges);

  if (!Object.keys(positions).length) {
    return (
      <div className="flex items-center justify-center h-[560px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const focusedNeighbors = focused
    ? new Set(
        graphData.edges
          .filter(e => e.source === focused || e.target === focused)
          .flatMap(e => [e.source, e.target])
      )
    : null;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="rounded-lg bg-muted/20 border border-border/40">
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#6b7280" opacity="0.5" />
        </marker>
      </defs>

      {/* Edges */}
      {graphData.edges.map((e, i) => {
        const a = positions[e.source];
        const b = positions[e.target];
        if (!a || !b) return null;
        const isHighlighted = focused
          ? e.source === focused || e.target === focused
          : true;
        return (
          <line
            key={i}
            x1={a.x} y1={a.y}
            x2={b.x} y2={b.y}
            stroke={isHighlighted ? '#6b7280' : '#6b72802a'}
            strokeWidth={isHighlighted ? e.weight : 0.8}
            opacity={isHighlighted ? 0.5 : 0.15}
          />
        );
      })}

      {/* Nodes */}
      {graphData.nodes.map(node => {
        const p = positions[node.id];
        if (!p) return null;
        const isFocused = focused === node.id;
        const isNeighbor = focusedNeighbors?.has(node.id) ?? true;
        const opacity = focused ? (isFocused || isNeighbor ? 1 : 0.2) : 1;

        return (
          <g
            key={node.id}
            transform={`translate(${p.x},${p.y})`}
            onClick={() => onFocus(isFocused ? null : node.id)}
            className="cursor-pointer"
            opacity={opacity}
          >
            <circle
              r={node.size}
              fill={node.color}
              stroke={isFocused ? 'white' : 'transparent'}
              strokeWidth={2}
              opacity={node.type === 'task' ? 0.8 : 0.9}
            />
            {/* Label for categories/agents or focused tasks */}
            {(node.type !== 'task' || isFocused || node.size >= 14) && (
              <text
                textAnchor="middle"
                dy={node.size + 12}
                fontSize={node.type === 'category' ? 11 : 9}
                fill="currentColor"
                className="fill-foreground"
                opacity={0.85}
              >
                {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Search Result Item ───────────────────────────────────────────────────────

const TYPE_ICON = {
  task: CheckSquare,
  memory: FileText,
  category: FolderOpen,
};

const TYPE_COLOR: Record<string, string> = {
  task: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  memory: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  category: 'bg-green-500/15 text-green-600 dark:text-green-400',
};

const STATUS_COLOR: Record<string, string> = {
  done: 'bg-emerald-500/15 text-emerald-600',
  'in-progress': 'bg-blue-500/15 text-blue-600',
  review: 'bg-yellow-500/15 text-yellow-600',
  backlog: 'bg-gray-500/15 text-gray-500',
  failed: 'bg-red-500/15 text-red-500',
};

function ResultItem({ result }: { result: SearchResult }) {
  const Icon = TYPE_ICON[result.type];
  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/40">
      <div className={`mt-0.5 p-1.5 rounded-md ${TYPE_COLOR[result.type]}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{result.title}</p>
          <span className="text-[10px] text-muted-foreground shrink-0">
            score {result.score.toFixed(1)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {result.excerpt}
        </p>
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1 py-0 ${TYPE_COLOR[result.type]}`}>
            {result.type}
          </Badge>
          {result.meta?.status && (
            <Badge variant="outline" className={`text-[10px] px-1 py-0 ${STATUS_COLOR[result.meta.status] ?? ''}`}>
              {result.meta.status}
            </Badge>
          )}
          {result.meta?.priority && (
            <span className="text-[10px] text-muted-foreground">{result.meta.priority}</span>
          )}
          {result.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] text-muted-foreground/70">#{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [total, setTotal] = useState(0);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [focused, setFocused] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load graph data on mount
  useEffect(() => {
    fetch('/api/knowledge/graph')
      .then(r => r.json())
      .then((d: GraphData) => { setGraphData(d); setGraphLoading(false); })
      .catch(() => setGraphLoading(false));
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(q)}&limit=15`);
      const json = await res.json() as { results: SearchResult[]; total: number };
      setResults(json.results);
      setTotal(json.total);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Knowledge Graph</h1>
          <p className="text-xs text-muted-foreground">
            Search tasks, memory files, and categories — visualize connections
          </p>
        </div>
      </div>

      {/* Stats row */}
      {graphData && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span><strong>{graphData.stats.taskCount}</strong> tasks</span>
          <span><strong>{graphData.stats.categoryCount}</strong> categories</span>
          <span><strong>{graphData.stats.agentCount}</strong> agents</span>
          {Object.entries(graphData.stats.statusBreakdown).map(([s, n]) => n > 0 && (
            <span key={s} className={STATUS_COLOR[s] + ' px-1.5 py-0.5 rounded text-[10px]'}>
              {n} {s}
            </span>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Graph — wider */}
        <div className="lg:col-span-3 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Connection Map</CardTitle>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-[#10b981]" />done</div>
                  <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-[#3b82f6]" />in-progress</div>
                  <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-[#f59e0b]" />review</div>
                  <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-[#6b7280]" />backlog</div>
                  <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-[#8b5cf6]" />agent</div>
                </div>
              </div>
              {focused && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Focused: <strong>{graphData?.nodes.find(n => n.id === focused)?.label}</strong></span>
                  <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setFocused(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {graphLoading ? (
                <div className="flex items-center justify-center h-[560px]">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : graphData ? (
                <KnowledgeGraphSVG
                  graphData={graphData}
                  focused={focused}
                  onFocus={setFocused}
                />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Could not load graph data.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Focused node details */}
          {focused && graphData && (() => {
            const node = graphData.nodes.find(n => n.id === focused);
            const connectedEdges = graphData.edges.filter(e => e.source === focused || e.target === focused);
            const neighbors = connectedEdges.map(e => {
              const nid = e.source === focused ? e.target : e.source;
              return graphData.nodes.find(n => n.id === nid);
            }).filter(Boolean);
            if (!node) return null;
            return (
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: node.color }} />
                    <span className="text-sm font-medium">{node.label}</span>
                    <Badge variant="outline" className="text-[10px] px-1">{node.type}</Badge>
                    {node.meta?.status && (
                      <Badge variant="outline" className={`text-[10px] px-1 ${STATUS_COLOR[node.meta.status as string] ?? ''}`}>
                        {node.meta.status as string}
                      </Badge>
                    )}
                  </div>
                  {node.meta?.fullTitle && node.meta.fullTitle !== node.label && (
                    <p className="text-xs text-muted-foreground mb-2">{node.meta.fullTitle as string}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Connected to {neighbors.length} node{neighbors.length !== 1 ? 's' : ''}:
                    {neighbors.slice(0, 5).map(n => (
                      <span key={n!.id} className="inline-flex items-center gap-0.5 mx-1">
                        <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: n!.color }} />
                        {n!.label}
                      </span>
                    ))}
                  </p>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Search — narrower */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks, memory, categories…"
              className="pl-9 pr-4"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </div>

          {query.length >= 2 && (
            <p className="text-xs text-muted-foreground">
              {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            </p>
          )}

          <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
            {results.length > 0 ? (
              results.map(r => <ResultItem key={r.id} result={r} />)
            ) : query.length >= 2 && !searching ? (
              <p className="text-xs text-muted-foreground text-center py-8">No results found.</p>
            ) : query.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Brain className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Type to search across all tasks, memory files, and categories
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  Try: &quot;kalshi&quot;, &quot;dashboard&quot;, &quot;analytics&quot;, &quot;agent&quot;
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
