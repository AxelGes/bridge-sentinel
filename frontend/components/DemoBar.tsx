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
    <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest bg-amber-200 text-amber-800">
          dev only
        </span>
        <span className="text-xs text-amber-800">
          {isRunning
            ? "Running — watching agents react..."
            : isDone
            ? "Replay complete. Risk Agent scored the attack."
            : "KelpDAO replay — 1-of-1 DVN bridge, 116.5k rsETH mint, max-LTV borrow."}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {isDone && (
          <Button variant="outline" size="sm" onClick={onReset} className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100">
            Reset
          </Button>
        )}
        <Button
          size="sm"
          onClick={onRun}
          disabled={isRunning}
          className="h-7 text-xs min-w-[130px] bg-amber-600 hover:bg-amber-700 text-white border-0"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
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
