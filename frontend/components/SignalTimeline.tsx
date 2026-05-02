import { Badge } from "@/components/ui/badge";
import { dvnBadgeClasses, severityBadgeClasses } from "@/lib/risk-colors";
import type { AnomalySignal, ConfigSignal, Signal } from "@/lib/types";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isoTime(ts: number): string {
  return new Date(ts).toISOString();
}

function shortenAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function ConfigEntry({ signal }: { signal: ConfigSignal }) {
  return (
    <li className="flex gap-3 animate-slide-in">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 dark:bg-primary/20">
          C
        </div>
        <div className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-semibold font-[family-name:var(--font-display)]">Config Agent</span>
          <Badge variant="outline" className={`text-xs ${dvnBadgeClasses(signal.score)}`}>
            DVN {signal.score}/10
          </Badge>
          <time dateTime={isoTime(signal.timestamp)} className="text-xs text-muted-foreground ml-auto shrink-0">
            {formatTime(signal.timestamp)}
          </time>
        </div>
        <p className="text-sm text-foreground leading-snug">{signal.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground font-mono truncate" translate="no">{signal.evidence}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Contract: <span className="font-mono" translate="no">{shortenAddr(signal.contract)}</span>
        </p>
      </div>
    </li>
  );
}

function AnomalyEntry({ signal }: { signal: AnomalySignal }) {
  const deposit = (BigInt(signal.depositAmount) / BigInt(1e18)).toLocaleString();
  const borrow = (BigInt(signal.borrowAmount) / BigInt(1e18)).toLocaleString();

  return (
    <li className="flex gap-3 animate-slide-in">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold shrink-0 dark:bg-orange-950 dark:text-orange-400">
          A
        </div>
        <div className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-semibold font-[family-name:var(--font-display)]">Anomaly Agent</span>
          <Badge variant="outline" className={`text-xs uppercase ${severityBadgeClasses(signal.severity)}`}>
            {signal.severity}
          </Badge>
          <time dateTime={isoTime(signal.timestamp)} className="text-xs text-muted-foreground ml-auto shrink-0">
            {formatTime(signal.timestamp)}
          </time>
        </div>
        <p className="text-sm text-foreground leading-snug">
          Wallet <span className="font-mono" translate="no">{shortenAddr(signal.wallet)}</span> deposited{" "}
          <strong>{deposit} {signal.asset}</strong> then borrowed{" "}
          <strong>{borrow} WETH</strong> at {signal.ltv}% LTV
        </p>
        {signal.txHashes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {signal.txHashes.map((h) => (
              <span key={h} className="text-xs text-muted-foreground font-mono" translate="no">
                tx: {shortenHash(h)}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

interface SignalTimelineProps {
  signals: Signal[];
}

export function SignalTimeline({ signals }: SignalTimelineProps) {
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border">
          <span className="text-lg text-muted-foreground/40">◎</span>
        </div>
        <p>Monitoring — no signals yet</p>
        <p className="text-xs">Run the demo to replay the KelpDAO exploit scenario</p>
      </div>
    );
  }

  const sorted = [...signals].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <ol className="flex flex-col" aria-label="Agent signals, newest first">
      {sorted.map((signal, i) => (
        signal.type === "config" ? (
          <ConfigEntry key={`${signal.type}-${signal.timestamp}-${i}`} signal={signal as ConfigSignal} />
        ) : (
          <AnomalyEntry key={`${signal.type}-${signal.timestamp}-${i}`} signal={signal as AnomalySignal} />
        )
      ))}
    </ol>
  );
}
