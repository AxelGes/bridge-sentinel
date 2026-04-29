import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AgentStatus, AnomalySignal, ConfigSignal } from "@/lib/types";

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function signalSummary(agent: AgentStatus): string {
  if (!agent.lastSignal) return "No signals yet";
  const s = agent.lastSignal;
  if (s.type === "config") {
    return `DVN score ${(s as ConfigSignal).score}/10 — ${(s as ConfigSignal).summary}`;
  }
  const a = s as AnomalySignal;
  return `${a.severity.toUpperCase()} — LTV ${a.ltv}% on ${a.asset}`;
}

function roleLabel(role: AgentStatus["role"]): string {
  if (role === "config") return "Config";
  if (role === "anomaly") return "Anomaly";
  return "Risk";
}

interface AgentCardProps {
  agent: AgentStatus;
}

export function AgentCard({ agent }: AgentCardProps) {
  const isOnline = agent.status === "online";

  return (
    <Card className="flex flex-col gap-0">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isOnline ? "bg-green-500" : "bg-zinc-300"
              }`}
            />
            <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {roleLabel(agent.role)}
          </Badge>
          {agent.ensName && (
            <span className="text-xs text-muted-foreground font-mono">
              {agent.ensName}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {signalSummary(agent)}
        </p>
        {agent.lastSignal && (
          <p className="mt-2 text-xs text-muted-foreground/60">
            {formatRelative(agent.lastSignal.timestamp)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
