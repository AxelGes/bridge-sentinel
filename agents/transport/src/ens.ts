import { createPublicClient, http, namehash, type Address } from "viem";
import { sepolia } from "viem/chains";

const PUBLIC_RESOLVER = "0x8FADE66B79cC9f1C6F971901BaD22D7FE7E9C0aE" as Address;

const RESOLVER_ABI = [
  {
    type: "function",
    name: "text",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

export interface ENSConfig {
  bridgeAddress?: string;
  lendingAddress?: string;
  pauseThreshold?: number;
  agentPubkeys?: Record<string, string>;
}

export async function resolveENSConfig(
  ensName: string,
  sepoliaRpcUrl = "https://rpc.sepolia.org",
): Promise<ENSConfig> {
  const client = createPublicClient({ chain: sepolia, transport: http(sepoliaRpcUrl) });

  async function getText(name: string, key: string): Promise<string> {
    try {
      return await client.readContract({
        address: PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "text",
        args: [namehash(name), key],
      });
    } catch {
      return "";
    }
  }

  const protocolName = `kelpdao.${ensName}`;
  const [bridgeAddress, lendingAddress, pauseThreshold] = await Promise.all([
    getText(protocolName, "monitored.bridge"),
    getText(protocolName, "monitored.lending"),
    getText(protocolName, "pause.threshold"),
  ]);

  const [configPubkey, anomalyPubkey, riskPubkey] = await Promise.all([
    getText(`config.${ensName}`, "agent.axl_pubkey"),
    getText(`anomaly.${ensName}`, "agent.axl_pubkey"),
    getText(`risk.${ensName}`, "agent.axl_pubkey"),
  ]);

  return {
    bridgeAddress: bridgeAddress || undefined,
    lendingAddress: lendingAddress || undefined,
    pauseThreshold: pauseThreshold ? Number(pauseThreshold) : undefined,
    agentPubkeys: {
      config: configPubkey,
      anomaly: anomalyPubkey,
      risk: riskPubkey,
    },
  };
}
