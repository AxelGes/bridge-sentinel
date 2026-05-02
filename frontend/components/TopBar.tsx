"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWriteContract, useAccount } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { riskBadgeClasses, riskLabel } from "@/lib/risk-colors";

const MOCK_LENDING_ABI = [
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const LENDING_ADDRESS =
  (process.env.NEXT_PUBLIC_LENDING_ADDRESS as `0x${string}`) ?? undefined;

interface TopBarProps {
  riskScore: number | null;
  paused: boolean;
  onPausedChange?: (paused: boolean) => void;
}

export function TopBar({ riskScore, paused, onPausedChange }: TopBarProps) {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const isPauseActive =
    riskScore !== null &&
    riskScore >= 7 &&
    !paused &&
    isConnected &&
    !!LENDING_ADDRESS;

  function handlePause() {
    if (!LENDING_ADDRESS) return;
    writeContract(
      {
        address: LENDING_ADDRESS,
        abi: MOCK_LENDING_ABI,
        functionName: "pause",
      },
      {
        onSuccess: () => onPausedChange?.(true),
      },
    );
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur"
      aria-label="Bridge Sentinel navigation"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-base font-semibold tracking-tight font-[family-name:var(--font-display)]">
            Bridge Sentinel
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground hidden sm:inline">KelpDAO</span>
        </div>

        <div className="flex flex-1 items-center justify-center gap-2">
          {riskScore !== null && (
            <span className="text-sm text-muted-foreground hidden sm:inline">Risk</span>
          )}
          <Badge
            variant="outline"
            className={`text-xs font-semibold tabular-nums ${riskBadgeClasses(riskScore)}`}
          >
            {riskScore !== null
              ? `${riskScore.toFixed(1)} / 10`
              : "Awaiting data"}
          </Badge>
          {riskScore !== null && (
            <Badge
              variant="outline"
              className={`text-xs ${riskBadgeClasses(riskScore)} hidden sm:inline-flex`}
            >
              {riskLabel(riskScore)}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <div className="hidden sm:block">
            <ConnectButton
              chainStatus="icon"
              accountStatus="avatar"
              showBalance={false}
            />
          </div>
          <Button
            variant={paused ? "secondary" : isPauseActive ? "destructive" : "outline"}
            size="sm"
            disabled={!isPauseActive || isPending}
            onClick={handlePause}
            className={isPauseActive ? "shadow-md shadow-destructive/20" : ""}
          >
            {!paused && (
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full shrink-0 ${
                  isPauseActive
                    ? "bg-destructive-foreground animate-pulse"
                    : "bg-muted-foreground/30"
                }`}
              />
            )}
            {isPending
              ? "Pausing…"
              : paused
                ? "Protocol Paused"
                : "Pause Protocol"}
          </Button>
        </div>
      </div>
    </header>
  );
}
