export type SignalSeverity = "low" | "medium" | "high" | "critical";

export interface ConfigSignal {
  type: "config";
  protocol: string;
  contract: string;
  score: number;
  summary: string;
  evidence: string;
  timestamp: number;
}

export interface AnomalySignal {
  type: "anomaly";
  wallet: string;
  asset: string;
  depositAmount: string;
  borrowAmount: string;
  ltv: number;
  severity: SignalSeverity;
  txHashes: string[];
  timestamp: number;
}

export type Signal = ConfigSignal | AnomalySignal;

export interface RiskScore {
  score: number;
  explanation: string;
  recommendedAction: string;
  model: string;
  attestation?: string;
  timestamp: number;
}

export interface AgentStatus {
  name: string;
  role: "config" | "anomaly" | "risk";
  status: "online" | "offline" | "idle";
  lastSignal?: Signal;
  ensName?: string;
}
