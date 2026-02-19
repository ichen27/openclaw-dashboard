// Cost per 1M tokens (estimated 50/50 input/output split)
const MODEL_COSTS: Record<string, number> = {
  'claude-opus-4-5': 45, // $15 in + $75 out avg
  'claude-opus-4-6': 45,
  'claude-sonnet-4-5': 9, // $3 in + $15 out avg
  'claude-sonnet-4-6': 9,
  'claude-haiku-4-5': 1.5,
};

export interface SessionCost {
  estimated: number;
  model: string;
  tokens: number;
}

export function estimateCost(model: string, totalTokens: number): SessionCost {
  const normalizedModel = normalizeModelName(model);
  const costPer1M = MODEL_COSTS[normalizedModel] ?? 0;
  const estimated = (totalTokens / 1_000_000) * costPer1M;

  return {
    estimated: Math.round(estimated * 10000) / 10000,
    model: normalizedModel,
    tokens: totalTokens,
  };
}

function normalizeModelName(model: string): string {
  // Strip provider prefix like "anthropic/" or "ollama/"
  const stripped = model.includes('/') ? model.split('/').pop()! : model;
  return stripped;
}

export function isLocalModel(model: string): boolean {
  return model.startsWith('ollama/') || model.startsWith('ollama:');
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}
