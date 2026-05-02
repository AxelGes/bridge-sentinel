import "dotenv/config";
import { Wallet, JsonRpcProvider } from "ethers";
import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!;
const RPC_URL = process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai";
const PROVIDER_ADDRESS = process.env.ZG_PROVIDER_ADDRESS || "";

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  const broker = await createZGComputeNetworkBroker(wallet);

  console.log(`\n[setup-0g] wallet: ${wallet.address}`);

  // List all available chatbot services
  console.log("\n[setup-0g] fetching available providers...");
  const services = await broker.inference.listService();
  const chatbots = services.filter((s: any) => s.serviceType === "chatbot");

  console.log(`\nFound ${chatbots.length} chatbot providers:\n`);
  for (const s of chatbots) {
    console.log(`  Provider: ${s.provider}`);
    console.log(`  Model:    ${s.model || "unknown"}`);
    console.log(`  URL:      ${s.url}`);
    console.log("");
  }

  // If a provider address is given, deposit and fund it
  if (PROVIDER_ADDRESS) {
    console.log(`\n[setup-0g] funding provider ${PROVIDER_ADDRESS}...`);

    console.log("[setup-0g] depositing 4 OG to ledger...");
    await broker.ledger.depositFund(4);
    console.log("[setup-0g] deposit done");

    console.log("[setup-0g] transferring 1 OG to provider sub-account...");
    await broker.ledger.transferFund(PROVIDER_ADDRESS, "inference", BigInt(1) * BigInt(10 ** 18));
    console.log("[setup-0g] transfer done");

    console.log("\n[setup-0g] account ready. Add to agents/risk/.env:");
    console.log(`  ZG_PROVIDER_ADDRESS=${PROVIDER_ADDRESS}`);
  } else {
    console.log("\nTo fund a provider, set ZG_PROVIDER_ADDRESS in .env and run again.");
  }
}

main().catch((err) => {
  console.error("[setup-0g] error:", err.message);
  process.exit(1);
});
