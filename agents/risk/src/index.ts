import "dotenv/config";
import http from "node:http";
import { Wallet, JsonRpcProvider } from "ethers";
import type { Signal, ConfigSignal, AnomalySignal, RiskScore, AgentStatus } from "../../transport/src/types.js";
import { resolveENSConfig } from "../../transport/src/ens.js";
import { createTransport } from "../../transport/src/factory.js";

const HTTP_PORT = Number(process.env.RISK_AGENT_PORT) || 4000;
const USE_AXL = process.env.USE_AXL === "true";
const ENS_NAME = process.env.ENS_NAME || "bridgesentinel.eth";
const ZG_PRIVATE_KEY = process.env.ZG_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
const ZG_RPC_URL = process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai";
const ZG_PROVIDER_ADDRESS = process.env.ZG_PROVIDER_ADDRESS || "";
const ZG_MODEL = process.env.ZG_MODEL || "qwen-2.5-7b-instruct";

let latestConfig: ConfigSignal | null = null;
let latestAnomaly: AnomalySignal | null = null;
let latestRisk: RiskScore | null = null;
const signalHistory: Signal[] = [];
const riskHistory: RiskScore[] = [];

function buildPrompt(config: ConfigSignal | null, anomaly: AnomalySignal | null): string {
  let context = "You are a DeFi security risk assessment agent. Analyze the following signals and output ONLY valid JSON with these fields: score (0-10, where 10 is highest risk), explanation (string), recommended_action (string).\n\n";

  if (config) {
    context += `CONFIG SIGNAL:\n- Protocol: ${config.protocol}\n- Bridge contract: ${config.contract}\n- DVN security score: ${config.score}/10\n- Summary: ${config.summary}\n- Evidence: ${config.evidence}\n\n`;
  }

  if (anomaly) {
    const depositEth = Number(BigInt(anomaly.depositAmount)) / 1e18;
    const borrowEth = Number(BigInt(anomaly.borrowAmount)) / 1e18;
    context += `ANOMALY SIGNAL:\n- Wallet: ${anomaly.wallet}\n- Asset: ${anomaly.asset}\n- Deposit: ${depositEth.toFixed(2)} tokens\n- Borrow: ${borrowEth.toFixed(2)} tokens\n- LTV: ${anomaly.ltv}%\n- Severity: ${anomaly.severity}\n- Tx hashes: ${anomaly.txHashes.join(", ")}\n\n`;
  }

  context += "This pattern matches the KelpDAO exploit: a weak bridge config (1-of-1 DVN) combined with a large deposit and max-LTV borrow suggests collateral manipulation. Assess the overall risk.\n\nRespond with ONLY the JSON object, no markdown fences.";
  return context;
}

async function callZeroGCompute(prompt: string): Promise<{ result: any; attestation?: string }> {
  if (!ZG_PRIVATE_KEY || !ZG_PROVIDER_ADDRESS) {
    console.warn("[risk-agent] 0G Compute not configured, using fallback scoring");
    return { result: fallbackScore() };
  }

  try {
    const { createZGServingNetworkBroker } = await import("@0glabs/0g-serving-broker");
    const provider = new JsonRpcProvider(ZG_RPC_URL);
    const wallet = new Wallet(ZG_PRIVATE_KEY, provider);
    const broker = await createZGServingNetworkBroker(wallet);

    const headers = await broker.inference.getRequestHeaders(
      ZG_PROVIDER_ADDRESS,
      ZG_MODEL,
      prompt,
    );

    const response = await fetch(`https://${ZG_PROVIDER_ADDRESS}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        model: ZG_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const attestation = response.headers.get("ZG-Res-Key") ?? undefined;

    if (attestation) {
      try {
        const chatID = data.id;
        await broker.inference.processResponse(ZG_PROVIDER_ADDRESS, chatID);
        console.log("[risk-agent] 0G attestation verified");
      } catch (err) {
        console.warn("[risk-agent] attestation verification failed:", (err as Error).message);
      }
    }

    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    return { result: parsed, attestation };
  } catch (err) {
    console.error("[risk-agent] 0G Compute call failed:", (err as Error).message);
    console.warn("[risk-agent] falling back to rule-based scoring");
    return { result: fallbackScore() };
  }
}

function fallbackScore() {
  const configRisk = latestConfig ? (10 - latestConfig.score) : 5;
  const anomalyRisk = latestAnomaly
    ? (latestAnomaly.severity === "critical" ? 10 : latestAnomaly.severity === "high" ? 8 : latestAnomaly.severity === "medium" ? 6 : 3)
    : 0;
  const score = Math.min(10, Math.round((configRisk * 0.4 + anomalyRisk * 0.6) * 10) / 10);
  return {
    score,
    explanation: `Rule-based assessment: bridge config risk ${configRisk}/10, anomaly risk ${anomalyRisk}/10. ${latestAnomaly ? `Wallet ${latestAnomaly.wallet} deposited and borrowed at ${latestAnomaly.ltv}% LTV with ${latestAnomaly.severity} severity.` : "No anomaly detected yet."} ${latestConfig ? `Bridge uses ${latestConfig.evidence}.` : ""}`,
    recommended_action: score >= 8 ? "PAUSE lending contract immediately" : score >= 5 ? "Monitor closely and prepare to pause" : "Continue monitoring",
  };
}

async function evaluateRisk() {
  if (!latestConfig && !latestAnomaly) return;

  console.log("[risk-agent] evaluating risk...");
  const prompt = buildPrompt(latestConfig, latestAnomaly);
  const { result, attestation } = await callZeroGCompute(prompt);

  latestRisk = {
    score: result.score,
    explanation: result.explanation,
    recommendedAction: result.recommended_action,
    model: ZG_PROVIDER_ADDRESS ? `${ZG_MODEL} via 0G Compute` : `${ZG_MODEL} (fallback)`,
    attestation,
    timestamp: Date.now(),
  };

  riskHistory.push(latestRisk);
  if (riskHistory.length > 50) riskHistory.shift();

  console.log(`[risk-agent] RISK SCORE: ${latestRisk.score}/10 — ${latestRisk.recommendedAction}`);
}

function handleSignal(signal: Signal) {
  signalHistory.push(signal);
  if (signalHistory.length > 100) signalHistory.shift();

  if (signal.type === "config") {
    latestConfig = signal;
    console.log(`[risk-agent] received config signal: score ${signal.score}/10`);
  } else if (signal.type === "anomaly") {
    latestAnomaly = signal;
    console.log(`[risk-agent] received anomaly signal: ${signal.severity} severity`);
  }

  evaluateRisk();
}

function jsonResponse(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

const agentStatuses = (): AgentStatus[] => [
  { name: "Config Agent", role: "config", status: latestConfig ? "online" : "idle", lastSignal: latestConfig ?? undefined, ensName: "config.bridgesentinel.eth" },
  { name: "Anomaly Agent", role: "anomaly", status: latestAnomaly ? "online" : "idle", lastSignal: latestAnomaly ?? undefined, ensName: "anomaly.bridgesentinel.eth" },
  { name: "Risk Agent", role: "risk", status: "online", ensName: "risk.bridgesentinel.eth" },
];

async function main() {
  // In AXL mode, start the AXL transport receiver for incoming signals
  if (USE_AXL) {
    let ensConfig;
    try {
      ensConfig = await resolveENSConfig(ENS_NAME, process.env.SEPOLIA_RPC_URL);
    } catch (err) {
      console.warn("[risk-agent] ENS resolution failed:", (err as Error).message);
    }
    const { transport } = createTransport({ useAxl: true, ensConfig });
    transport.onReceive((signal, fromPeerId) => {
      console.log(`[risk-agent] AXL signal from peer: ${fromPeerId ?? "unknown"}`);
      handleSignal(signal);
    });
    await transport.startReceiver(0);
    console.log(`[risk-agent] AXL transport receiver started`);
  }

  // HTTP API server — always runs for dashboard + fallback signal ingestion
  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/signal") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      req.on("end", () => {
        try {
          const signal = JSON.parse(body) as Signal;
          handleSignal(signal);
          jsonResponse(res, { ok: true });
        } catch {
          jsonResponse(res, { error: "invalid json" }, 400);
        }
      });
      return;
    }

    if (req.method === "GET" && req.url === "/status") {
      jsonResponse(res, {
        agents: agentStatuses(),
        riskScore: latestRisk,
        signals: signalHistory.slice(-20),
      });
      return;
    }

    if (req.method === "GET" && req.url === "/risk") {
      jsonResponse(res, latestRisk ?? { score: 0, explanation: "No signals received yet", recommendedAction: "Waiting for data", model: ZG_MODEL, timestamp: Date.now() });
      return;
    }

    if (req.method === "GET" && req.url === "/signals") {
      jsonResponse(res, signalHistory.slice(-50));
      return;
    }

    if (req.method === "GET" && req.url === "/agents") {
      jsonResponse(res, agentStatuses());
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      jsonResponse(res, { ok: true, uptime: process.uptime() });
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });

  server.listen(HTTP_PORT, () => {
    console.log(`[risk-agent] HTTP server on :${HTTP_PORT}`);
    console.log(`[risk-agent] transport: ${USE_AXL ? "AXL (signals via AXL, API via HTTP)" : "local (signals + API via HTTP)"}`);
    console.log(`[risk-agent] 0G Compute: ${ZG_PROVIDER_ADDRESS ? "configured" : "fallback mode (set ZG_PROVIDER_ADDRESS)"}`);
  });
}

main().catch((err) => {
  console.error("[risk-agent] fatal:", err);
  process.exit(1);
});
