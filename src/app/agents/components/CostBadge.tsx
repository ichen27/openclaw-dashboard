'use client';

import { Badge } from '@/components/ui/badge';
import { formatCost } from '@/lib/costs';

export function CostBadge({ cost }: { cost: number }) {
  if (cost === 0) return null;
  return (
    <Badge variant="outline" className="font-mono text-xs tabular-nums">
      {formatCost(cost)}
    </Badge>
  );
}
