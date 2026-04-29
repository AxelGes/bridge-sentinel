import type { AgentStatus, AnomalySignal, ConfigSignal, RiskScore } from "./types";

const NOW = Date.now();

export const MOCK_CONFIG_SIGNAL: ConfigSignal = {
  type: "config",
  protocol: "KelpDAO",
  contract: "0xb47e3cd837dDF8e4c57f05d70ab865de6e193bbb",
  score: 2,
  summary: "Bridge is running 1-of-1 DVN configuration — single point of failure",
  evidence: "requiredDVNs=1, dvns=[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]",
  timestamp: NOW,
};

export const MOCK_ANOMALY_SIGNAL: AnomalySignal = {
  type: "anomaly",
  wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  asset: "rsETH",
  depositAmount: "116500000000000000000000",
  borrowAmount: "93200000000000000000000",
  ltv: 80,
  severity: "critical",
  txHashes: [
    "0xabc123def456aaa111bbb222ccc333ddd444eee555fff666000111222333444a1",
    "0xbbc123def456aaa111bbb222ccc333ddd444eee555fff666000111222333444b2",
  ],
  timestamp: NOW + 2000,
};

export const MOCK_RISK_SCORE: RiskScore = {
  score: 9.2,
  explanation:
    "The combination of a 1-of-1 DVN bridge config with an immediate max-LTV borrow following a large cross-chain mint is a textbook oracle/bridge exploit pattern. The attacker minted 116,500 rsETH via an under-secured bridge and immediately extracted 93,200 WETH (80% LTV) from the lending pool. This matches the KelpDAO exploit vector with very high confidence. Recommend immediate protocol pause.",
  recommendedAction: "Pause lending contract immediately. Investigate bridge DVN configuration and rotate to minimum 2-of-3 DVN setup before resuming.",
  model: "qwen-2.5-7b-instruct via 0G Compute",
  attestation: "ZG-Res-Key: 0x4a9f...c23e (TEE attestation pending)",
  timestamp: NOW + 4000,
};

export const MOCK_AGENT_STATUSES: AgentStatus[] = [
  {
    name: "Config Agent",
    role: "config",
    status: "online",
    lastSignal: MOCK_CONFIG_SIGNAL,
    ensName: "config.bridgesentinel.eth",
  },
  {
    name: "Anomaly Agent",
    role: "anomaly",
    status: "online",
    lastSignal: MOCK_ANOMALY_SIGNAL,
    ensName: "anomaly.bridgesentinel.eth",
  },
  {
    name: "Risk Agent",
    role: "risk",
    status: "online",
    ensName: "risk.bridgesentinel.eth",
  },
];
