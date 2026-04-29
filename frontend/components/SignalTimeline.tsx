import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AnomalySignal, ConfigSignal, Signal } from "@/lib/types";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function shortenAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function ConfigEntry({ signal }: { signal: ConfigSignal }) {
  const scoreColor =
    signal.score <= 3
      ? "bg-red-100 text-red-700 border-red-200"
      : signal.score <= 6
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-green-100 text-green-700 border-green-200";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
          C
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-semibold">Config Agent</span>
          <Badge variant="outline" className={`text-xs ${scoreColor}`}>
            DVN {signal.score}/10
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatTime(signal.timestamp)}</span>
        </div>
        <p className="text-sm text-foreground leading-snug">{signal.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground font-mono truncate">{signal.evidence}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Contract: <span className="font-mono">{shortenAddr(signal.contract)}</span>
        </p>
      </div>
    </div>
  );
}

function AnomalyEntry({ signal }: { signal: AnomalySignal }) {
  const severityColor =
    signal.severity === "critical"
      ? "bg-red-100 text-red-700 border-red-200"
      : signal.severity === "high"
      ? "bg-orange-100 text-orange-700 border-orange-200"
      : signal.severity === "medium"
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-zinc-100 text-zinc-600 border-zinc-200";

  const deposit = (BigInt(signal.depositAmount) / BigInt(1e18)).toLocaleString();
  const borrow = (BigInt(signal.borrowAmount) / BigInt(1e18)).toLocaleString();

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold shrink-0">
          A
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-semibold">Anomaly Agent</span>
          <Badge variant="outline" className={`text-xs uppercase ${severityColor}`}>
            {signal.severity}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatTime(signal.timestamp)}</span>
        </div>
        <p className="text-sm text-foreground leading-snug">
          Wallet <span className="font-mono">{shortenAddr(signal.wallet)}</span> deposited{" "}
          <strong>{deposit} {signal.asset}</strong> then borrowed{" "}
          <strong>{borrow} WETH</strong> at {signal.ltv}% LTV
        </p>
        {signal.txHashes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {signal.txHashes.map((h) => (
              <span key={h} className="text-xs text-muted-foreground font-mono">
                tx: {shortenHash(h)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SignalTimelineProps {
  signals: Signal[];
}

export function SignalTimeline({ signals }: SignalTimelineProps) {
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground gap-2">
        <span className="text-2xl">◎</span>
        <span>Monitoring — no signals yet</span>
        <span className="text-xs">Run the demo to see the KelpDAO replay</span>
      </div>
    );
  }

  const sorted = [...signals].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex flex-col">
      {sorted.map((signal, i) => (
        <div key={`${signal.type}-${signal.timestamp}-${i}`}>
          {signal.type === "config" ? (
            <ConfigEntry signal={signal as ConfigSignal} />
          ) : (
            <AnomalyEntry signal={signal as AnomalySignal} />
          )}
        </div>
      ))}
    </div>
  );
}
