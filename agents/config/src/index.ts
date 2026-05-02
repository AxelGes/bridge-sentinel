import "dotenv/config";
import { createPublicClient, http, type Address } from "viem";
import { MockOFTBridgeABI } from "./abi.js";
import type { ConfigSignal } from "../../transport/src/types.js";
import type { Transport } from "../../transport/src/transport.js";
import { resolveENSConfig, type ENSConfig } from "../../transport/src/ens.js";
import { createTransport } from "../../transport/src/factory.js";

const RPC_URL = process.env.RPC_URL || "https://evmrpc-testnet.0g.ai";
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL_MS) || 15_000;
const HTTP_PORT = Number(process.env.CONFIG_AGENT_PORT) || 4001;
const ENS_NAME = process.env.ENS_NAME || "bridgesentinel.eth";
const USE_AXL = process.env.USE_AXL === "true";

let BRIDGE_ADDRESS = process.env.MOCK_BRIDGE_ADDRESS as Address;

async function resolveConfig() {
  let ensConfig: ENSConfig | undefined;
  console.log("[config-agent] resolving config from ENS...");
  try {
    ensConfig = await resolveENSConfig(ENS_NAME, process.env.SEPOLIA_RPC_URL);
    if (!BRIDGE_ADDRESS && ensConfig.bridgeAddress) {
      BRIDGE_ADDRESS = ensConfig.bridgeAddress as Address;
      console.log(`[config-agent] ENS → bridge: ${BRIDGE_ADDRESS}`);
    }
  } catch (err) {
    console.warn("[config-agent] ENS resolution failed:", (err as Error).message);
  }
  if (!BRIDGE_ADDRESS) {
    console.error("[config-agent] MOCK_BRIDGE_ADDRESS is required (env or ENS)");
    process.exit(1);
  }

  const result = createTransport({ useAxl: USE_AXL, ensConfig });
  transport = result.transport;
  sendTarget = result.sendTarget;
  console.log(`[config-agent] transport: ${USE_AXL ? "AXL" : "local"}, target: ${sendTarget}`);
}

const client = createPublicClient({ transport: http(RPC_URL) });

let transport: Transport;
let sendTarget: string;

function scoreDVN(required: number, dvnCount: number): number {
  if (dvnCount === 0) return 1;
  const key = `${required}-of-${dvnCount}`;
  const scores: Record<string, number> = {
    "1-of-1": 2,
    "1-of-2": 4,
    "2-of-2": 5,
    "2-of-3": 7,
    "3-of-3": 8,
    "3-of-5": 9,
  };
  return scores[key] ?? Math.min(10, required * 2 + dvnCount);
}

let lastScore: number | null = null;

async function poll() {
  try {
    const [required, dvns] = await client.readContract({
      address: BRIDGE_ADDRESS,
      abi: MockOFTBridgeABI,
      functionName: "getDVNConfig",
    });

    const requiredNum = Number(required);
    const dvnCount = dvns.length;
    const score = scoreDVN(requiredNum, dvnCount);

    if (score !== lastScore) {
      const signal: ConfigSignal = {
        type: "config",
        protocol: "KelpDAO",
        contract: BRIDGE_ADDRESS,
        score,
        summary: `Bridge DVN config: ${requiredNum}-of-${dvnCount} — ${score <= 3 ? "HIGH RISK" : score <= 6 ? "MEDIUM RISK" : "LOW RISK"}`,
        evidence: `requiredDVNs=${requiredNum}, dvns=[${dvns.join(", ")}]`,
        timestamp: Date.now(),
      };

      console.log(`[config-agent] DVN score: ${score}/10 (${requiredNum}-of-${dvnCount})`);

      try {
        await transport.send(sendTarget, signal);
        lastScore = score;
        console.log("[config-agent] signal sent to risk agent");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[config-agent] failed to send signal:", msg);
      }
    }
  } catch (err) {
    console.error("[config-agent] poll error:", (err as Error).message);
  }
}

async function main() {
  await resolveConfig();
  console.log(`[config-agent] watching bridge ${BRIDGE_ADDRESS}`);
  console.log(`[config-agent] polling every ${POLL_INTERVAL}ms, sending to ${sendTarget}`);

  await transport.startReceiver(HTTP_PORT);
  console.log(`[config-agent] HTTP server on :${HTTP_PORT}`);

  await poll();
  setInterval(poll, POLL_INTERVAL);
}

main().catch((err) => {
  console.error("[config-agent] fatal:", err);
  process.exit(1);
});
