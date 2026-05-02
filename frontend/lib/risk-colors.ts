type RiskLevel = "critical" | "elevated" | "low" | "neutral";

const RISK: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  critical: {
    bg: "bg-red-100 dark:bg-red-950",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  elevated: {
    bg: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  low: {
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  neutral: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
  },
};

export function riskLevel(score: number | null): RiskLevel {
  if (score === null) return "neutral";
  if (score >= 8) return "critical";
  if (score >= 5) return "elevated";
  return "low";
}

export function riskBadgeClasses(score: number | null): string {
  const r = RISK[riskLevel(score)];
  return `${r.bg} ${r.text} ${r.border}`;
}

export function riskRingClass(score: number | null): string {
  return RISK[riskLevel(score)].border;
}

export function riskTextClass(score: number | null): string {
  return RISK[riskLevel(score)].text;
}

export function dvnBadgeClasses(dvnScore: number): string {
  if (dvnScore <= 3) return riskBadgeClasses(10);
  if (dvnScore <= 6) return riskBadgeClasses(6);
  return riskBadgeClasses(3);
}

export function severityBadgeClasses(severity: string): string {
  switch (severity) {
    case "critical":
      return riskBadgeClasses(10);
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800";
    case "medium":
      return riskBadgeClasses(6);
    default:
      return riskBadgeClasses(null);
  }
}

export function riskLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 8) return "CRITICAL";
  if (score >= 5) return "ELEVATED";
  return "LOW";
}
