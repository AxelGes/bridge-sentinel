import "dotenv/config";
import { createPublicClient, http, formatEther, type Address, type Log } from "viem";
import { MockLendingABI } from "./abi.js";
import type { AnomalySignal, SignalSeverity } from "../../transport/src/types.js";
import type { Transport } from "../../transport/src/transport.js";
import { resolveENSConfig, type ENSConfig } from "../../transport/src/ens.js";
import { createTransport } from "../../transport/src/factory.js";

const RPC_URL = process.env.RPC_URL || "https://evmrpc-testnet.0g.ai";
let LENDING_ADDRESS = process.env.MOCK_LENDING_ADDRESS as Address;
const HTTP_PORT = Number(process.env.ANOMALY_AGENT_PORT) || 4002;
const ENS_NAME = process.env.ENS_NAME || "bridgesentinel.eth";
const USE_AXL = process.env.USE_AXL === "true";

const DEPOSIT_SUPPLY_THRESHOLD = Number(process.env.DEPOSIT_SUPPLY_PCT) || 30;
const LTV_THRESHOLD = Number(process.env.LTV_THRESHOLD_PCT) || 70;
const WINDOW_MS = Number(process.env.WINDOW_MS) || 300_000;

async function resolveConfig() {
  let ensConfig: ENSConfig | undefined;
  console.log("[anomaly-agent] resolving config from ENS...");
  try {
    ensConfig = await resolveENSConfig(ENS_NAME, process.env.SEPOLIA_RPC_URL);
    if (!LENDING_ADDRESS && ensConfig.lendingAddress) {
      LENDING_ADDRESS = ensConfig.lendingAddress as Address;
      console.log(`[anomaly-agent] ENS → lending: ${LENDING_ADDRESS}`);
    }
  } catch (err) {
    console.warn("[anomaly-agent] ENS resolution failed:", (err as Error).message);
  }
  if (!LENDING_ADDRESS) {
    console.error("[anomaly-agent] MOCK_LENDING_ADDRESS is required (env or ENS)");
    process.exit(1);
  }

  const result = createTransport({ useAxl: USE_AXL, ensConfig });
  transport = result.transport;
  sendTarget = result.sendTarget;
  console.log(`[anomaly-agent] transport: ${USE_AXL ? "AXL" : "local"}, target: ${sendTarget}`);
}

const client = createPublicClient({ transport: http(RPC_URL) });

let transport: Transport;
let sendTarget: string;

interface WalletActivity {
  depositAmount: bigint;
  depositTxHash: string;
  depositTime: number;
}

const recentDeposits = new Map<string, WalletActivity>();

function severity(ltv: number, supplyPct: number): SignalSeverity {
  if (ltv >= 75 && supplyPct >= 50) return "critical";
  if (ltv >= 70 && supplyPct >= 30) return "high";
  if (ltv >= 50) return "medium";
  return "low";
}

async function handleDeposit(log: Log) {
  const user = (log as any).args?.user as Address;
  const amount = (log as any).args?.amount as bigint;
  if (!user || !amount) return;

  console.log(`[anomaly-agent] Deposit: ${user} deposited ${formatEther(amount)} rsETH`);

  recentDeposits.set(user.toLowerCase(), {
    depositAmount: amount,
    depositTxHash: log.transactionHash ?? "0x",
    depositTime: Date.now(),
  });
}

async function handleBorrow(log: Log) {
  const user = (log as any).args?.user as Address;
  const borrowAmount = (log as any).args?.amount as bigint;
  if (!user || !borrowAmount) return;

  console.log(`[anomaly-agent] Borrow: ${user} borrowed ${formatEther(borrowAmount)} WETH`);

  const key = user.toLowerCase();
  const activity = recentDeposits.get(key);
  if (!activity) return;

  if (Date.now() - activity.depositTime > WINDOW_MS) {
    recentDeposits.delete(key);
    return;
  }

  const totalDeposits = await client.readContract({
    address: LENDING_ADDRESS,
    abi: MockLendingABI,
    functionName: "totalDeposits",
  });

  const supplyPct = totalDeposits > 0n
    ? Number((activity.depositAmount * 100n) / totalDeposits)
    : 100;

  const ltv = activity.depositAmount > 0n
    ? Number((borrowAmount * 100n) / activity.depositAmount)
    : 0;

  if (supplyPct < DEPOSIT_SUPPLY_THRESHOLD && ltv < LTV_THRESHOLD) return;

  const sev = severity(ltv, supplyPct);

  const signal: AnomalySignal = {
    type: "anomaly",
    wallet: user,
    asset: "rsETH",
    depositAmount: activity.depositAmount.toString(),
    borrowAmount: borrowAmount.toString(),
    ltv,
    severity: sev,
    txHashes: [activity.depositTxHash, log.transactionHash ?? "0x"],
    timestamp: Date.now(),
  };

  console.log(`[anomaly-agent] ANOMALY DETECTED: ${sev} — LTV ${ltv}%, supply ${supplyPct}%`);

  try {
    await transport.send(sendTarget, signal);
    console.log("[anomaly-agent] signal sent to risk agent");
  } catch (err) {
    console.warn("[anomaly-agent] failed to send signal:", (err as Error).message);
  }

  recentDeposits.delete(key);
}

async function main() {
  await resolveConfig();
  console.log(`[anomaly-agent] watching lending ${LENDING_ADDRESS}`);
  console.log(`[anomaly-agent] thresholds: deposit>${DEPOSIT_SUPPLY_THRESHOLD}% supply, LTV>${LTV_THRESHOLD}%`);

  await transport.startReceiver(HTTP_PORT);
  console.log(`[anomaly-agent] HTTP server on :${HTTP_PORT}`);

  client.watchContractEvent({
    address: LENDING_ADDRESS,
    abi: MockLendingABI,
    eventName: "Deposit",
    onLogs: (logs) => { for (const log of logs) handleDeposit(log); },
  });

  client.watchContractEvent({
    address: LENDING_ADDRESS,
    abi: MockLendingABI,
    eventName: "Borrow",
    onLogs: (logs) => { for (const log of logs) handleBorrow(log); },
  });

  console.log("[anomaly-agent] listening for Deposit and Borrow events...");
}

main().catch((err) => {
  console.error("[anomaly-agent] fatal:", err);
  process.exit(1);
});
