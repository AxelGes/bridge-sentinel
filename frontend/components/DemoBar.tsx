"use client";

import { Button } from "@/components/ui/button";

interface DemoBarProps {
  isRunning: boolean;
  isDone: boolean;
  onRun: () => void;
  onReset: () => void;
}

export function DemoBar({ isRunning, isDone, onRun, onReset }: DemoBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-primary/15 bg-primary/5 px-5 py-3 animate-fade-in dark:border-primary/20 dark:bg-primary/10">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold font-[family-name:var(--font-display)]">KelpDAO Replay</span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest bg-primary/10 text-primary dark:bg-primary/20">
            dev
          </span>
        </div>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {isRunning
            ? "Running — watching agents react..."
            : isDone
            ? "Replay complete. Risk Agent scored the attack."
            : "Simulate the KelpDAO exploit: 1-of-1 DVN bridge, 116.5k rsETH mint, max-LTV borrow."}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {isDone && (
          <Button variant="outline" size="sm" onClick={onReset}>
            Reset
          </Button>
        )}
        <Button
          size="sm"
          onClick={onRun}
          disabled={isRunning}
          className="min-w-[140px]"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
              Running…
            </span>
          ) : isDone ? (
            "Run Again"
          ) : (
            "Run KelpDAO Replay"
          )}
        </Button>
      </div>
    </div>
  );
}
