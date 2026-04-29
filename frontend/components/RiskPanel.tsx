import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { RiskScore } from "@/lib/types";

function scoreColor(score: number): { ring: string; text: string; badge: string } {
  if (score >= 8) return { ring: "border-red-300", text: "text-red-600", badge: "bg-red-100 text-red-700 border-red-200" };
  if (score >= 5) return { ring: "border-yellow-300", text: "text-yellow-600", badge: "bg-yellow-100 text-yellow-700 border-yellow-200" };
  return { ring: "border-green-300", text: "text-green-600", badge: "bg-green-100 text-green-700 border-green-200" };
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface RiskPanelProps {
  riskScore: RiskScore | null;
}

export function RiskPanel({ riskScore }: RiskPanelProps) {
  if (!riskScore) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Risk Agent</CardTitle>
          <p className="text-xs text-muted-foreground">0G Compute · qwen-2.5-7b-instruct</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border">
              <span className="text-2xl font-bold text-muted-foreground/30">?</span>
            </div>
            <p className="text-sm">Awaiting signals from Config and Anomaly agents</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const colors = scoreColor(riskScore.score);

  return (
    <Card className={`border-2 ${colors.ring}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Risk Agent</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{riskScore.model}</p>
          </div>
          <span className="text-xs text-muted-foreground">{formatTime(riskScore.timestamp)}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 ${colors.ring}`}
          >
            <span className={`text-3xl font-bold tabular-nums ${colors.text}`}>
              {riskScore.score.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Badge variant="outline" className={`w-fit text-xs uppercase font-semibold ${colors.badge}`}>
              {riskScore.score >= 8 ? "Critical Risk" : riskScore.score >= 5 ? "Elevated Risk" : "Low Risk"}
            </Badge>
            <p className="text-xs text-muted-foreground font-mono">
              Score out of 10
            </p>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Analysis
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {riskScore.explanation}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Recommended Action
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {riskScore.recommendedAction}
          </p>
        </div>

        {riskScore.attestation && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Attestation
              </p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {riskScore.attestation}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
