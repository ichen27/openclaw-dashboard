"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { key: "j", description: "Next task" },
  { key: "k", description: "Previous task" },
  { key: "e", description: "Edit selected task" },
  { key: "n", description: "New task" },
  { key: "/", description: "Focus search" },
  { key: "Esc", description: "Close dialog / deselect" },
  { key: "?", description: "Show keyboard shortcuts" },
] as const;

export function KeyboardShortcuts({
  searchInputRef,
  onNewTask,
}: {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onNewTask: () => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Esc always works
      if (e.key === "Escape") {
        setHelpOpen(false);
        // Deselect task - dispatch custom event
        window.dispatchEvent(new CustomEvent("keyboard:deselect"));
        if (isInputFocused) {
          (target as HTMLElement).blur();
        }
        return;
      }

      // Skip other shortcuts when input is focused
      if (isInputFocused) return;

      switch (e.key) {
        case "?":
          e.preventDefault();
          setHelpOpen(true);
          break;
        case "/":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case "n":
          e.preventDefault();
          onNewTask();
          break;
        case "j":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("keyboard:next"));
          break;
        case "k":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("keyboard:prev"));
          break;
        case "e":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("keyboard:edit"));
          break;
      }
    },
    [searchInputRef, onNewTask]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {SHORTCUTS.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between py-1.5 px-1"
            >
              <span className="text-sm text-muted-foreground">
                {description}
              </span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border border-border">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
