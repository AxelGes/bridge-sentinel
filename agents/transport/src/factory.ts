import type { Transport } from "./transport.js";
import type { ENSConfig } from "./ens.js";
import { LocalTransport } from "./local.js";
import { AxlTransport } from "./axl.js";

export interface TransportConfig {
  useAxl: boolean;
  axlApiPort?: number;
  riskAgentPubkey?: string;
  ensConfig?: ENSConfig;
  localTarget?: string;
}

export function createTransport(cfg: TransportConfig): { transport: Transport; sendTarget: string } {
  if (cfg.useAxl) {
    const port = cfg.axlApiPort ?? (Number(process.env.AXL_API_PORT) || 9002);
    const ensPubkeys = cfg.ensConfig?.agentPubkeys;
    const ensValues = ensPubkeys ? Object.values(ensPubkeys).filter(Boolean) : [];
    const knownPubkeys = ensValues.length > 0
      ? ensValues
      : [process.env.AXL_CONFIG_PUBKEY, process.env.AXL_ANOMALY_PUBKEY, process.env.AXL_RISK_PUBKEY].filter(Boolean) as string[];

    const transport = new AxlTransport({ axlApiPort: port, knownPubkeys });

    const sendTarget = cfg.riskAgentPubkey
      || cfg.ensConfig?.agentPubkeys?.risk
      || process.env.AXL_RISK_PUBKEY
      || "";

    return { transport, sendTarget };
  }

  const transport = new LocalTransport();
  const sendTarget = cfg.localTarget ?? process.env.RISK_AGENT_URL ?? "http://localhost:4000/signal";
  return { transport, sendTarget };
}
