'use client';

export function SearchTrigger() {
  return (
    <button
      className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-md border border-border/50 transition-colors"
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
        );
      }}
    >
      <span>Search</span>
      <kbd className="font-mono bg-background px-1 rounded text-[10px]">⌘K</kbd>
    </button>
  );
}
