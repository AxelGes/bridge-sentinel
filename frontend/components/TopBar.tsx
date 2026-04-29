"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWriteContract, useAccount } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const MOCK_LENDING_ABI = [
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// Populated once BearPrince deploys and commits sepolia.json
const LENDING_ADDRESS =
  (process.env.NEXT_PUBLIC_LENDING_ADDRESS as `0x${string}`) ?? undefined;

interface TopBarProps {
  riskScore: number | null;
  paused: boolean;
  onPausedChange?: (paused: boolean) => void;
}

function riskColor(score: number | null): string {
  if (score === null) return "bg-zinc-100 text-zinc-600 border-zinc-200";
  if (score >= 8) return "bg-red-100 text-red-700 border-red-200";
  if (score >= 5) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function riskLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 8) return "CRITICAL";
  if (score >= 5) return "ELEVATED";
  return "LOW";
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
    <header className='sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur'>
      <div className='mx-auto flex h-14 max-w-7xl items-center gap-4 px-6'>
        <div className='flex items-center gap-2 shrink-0'>
          <span className='text-base font-semibold tracking-tight'>
            Bridge Sentinel
          </span>
          <Separator orientation='vertical' className='h-4' />
          <span className='text-sm text-muted-foreground'>KelpDAO</span>
        </div>

        <div className='flex flex-1 items-center justify-center gap-2'>
          {riskScore !== null && (
            <span className='text-sm text-muted-foreground'>Risk Score</span>
          )}
          <Badge
            variant='outline'
            className={`text-xs font-semibold tabular-nums ${riskColor(riskScore)}`}
          >
            {riskScore !== null
              ? `${riskScore.toFixed(1)} / 10`
              : "Awaiting data"}
          </Badge>
          {riskScore !== null && (
            <Badge
              variant='outline'
              className={`text-xs ${riskColor(riskScore)}`}
            >
              {riskLabel(riskScore)}
            </Badge>
          )}
        </div>

        <div className='flex items-center gap-3 shrink-0 ml-auto'>
          <ConnectButton
            chainStatus='icon'
            accountStatus='avatar'
            showBalance={false}
          />
          <button
            disabled={!isPauseActive || isPending}
            onClick={handlePause}
            className={`
              inline-flex items-center gap-2 rounded-md border px-4 py-1.5 text-sm font-semibold
              transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              disabled:pointer-events-none disabled:opacity-40
              ${
                paused
                  ? "border-zinc-300 bg-zinc-100 text-zinc-500 cursor-default"
                  : isPauseActive
                    ? "border-red-600 bg-red-600 text-white shadow-md shadow-red-200 hover:bg-red-700 hover:border-red-700 active:scale-95"
                    : "border-zinc-200 bg-white text-zinc-400"
              }
            `}
          >
            {!paused && (
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${isPauseActive ? "bg-white animate-pulse" : "bg-zinc-300"}`}
              />
            )}
            {isPending
              ? "Pausing…"
              : paused
                ? "Protocol Paused"
                : "Pause Protocol"}
          </button>
        </div>
      </div>
    </header>
  );
}
