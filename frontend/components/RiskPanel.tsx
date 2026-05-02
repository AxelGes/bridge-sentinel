import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { riskBadgeClasses, riskRingClass, riskTextClass, riskLabel } from "@/lib/risk-colors";
import type { RiskScore } from "@/lib/types";

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
          <CardTitle className="text-sm font-semibold font-[family-name:var(--font-display)]">Risk Agent</CardTitle>
          <p className="text-xs text-muted-foreground">0G Compute · qwen-2.5-7b-instruct</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border">
              <span className="text-2xl font-bold text-muted-foreground/30">?</span>
            </div>
            <div className="text-center">
              <p className="text-sm">Awaiting agent signals</p>
              <p className="text-xs mt-1 text-muted-foreground/60">Config and Anomaly agents feed into this analysis</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${riskRingClass(riskScore.score)}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold font-[family-name:var(--font-display)]">Risk Agent</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{riskScore.model}</p>
          </div>
          <time dateTime={new Date(riskScore.timestamp).toISOString()} className="text-xs text-muted-foreground">
            {formatTime(riskScore.timestamp)}
          </time>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 ${riskRingClass(riskScore.score)}`}
            role="meter"
            aria-valuenow={riskScore.score}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-label={`Risk score: ${riskScore.score.toFixed(1)} out of 10`}
          >
            <span className={`text-3xl font-bold tabular-nums font-[family-name:var(--font-display)] ${riskTextClass(riskScore.score)}`}>
              {riskScore.score.toFixed(1)}
            </span>
          </div>
          <Badge variant="outline" className={`w-fit text-xs uppercase font-semibold ${riskBadgeClasses(riskScore.score)}`}>
            {riskLabel(riskScore.score)}
          </Badge>
        </div>

        <Separator />

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Analysis
          </h3>
          <p className="text-sm leading-relaxed text-foreground">
            {riskScore.explanation}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Recommended Action
          </h3>
          <p className="text-sm leading-relaxed text-foreground">
            {riskScore.recommendedAction}
          </p>
        </div>

        {riskScore.attestation && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                TEE Attestation
              </h3>
              <p className="text-xs text-muted-foreground font-mono break-all" translate="no">
                {riskScore.attestation}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
