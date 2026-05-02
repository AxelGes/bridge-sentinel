import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ERC20ABI, MockOFTBridgeABI, MockLendingABI } from "./abi.js";

const RPC_URL = process.env.RPC_URL || "https://evmrpc-testnet.0g.ai";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as Hex;
const BRIDGE = process.env.MOCK_BRIDGE_ADDRESS as Address;
const LENDING = process.env.MOCK_LENDING_ADDRESS as Address;
const RSETH = process.env.FAKE_RSETH_ADDRESS as Address;

if (!PRIVATE_KEY || !BRIDGE || !LENDING || !RSETH) {
  console.error("[demo] Missing env vars: DEPLOYER_PRIVATE_KEY, MOCK_BRIDGE_ADDRESS, MOCK_LENDING_ADDRESS, FAKE_RSETH_ADDRESS");
  process.exit(1);
}

const DEPOSIT_AMOUNT = parseEther("116500");
const BORROW_AMOUNT = parseEther("93200");

const chain = {
  id: 16602,
  name: "0G Testnet",
  nativeCurrency: { name: "0G", symbol: "OG", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

const t0 = Date.now();
function log(msg: string) {
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[demo +${elapsed}s] ${msg}`);
}

async function waitForReceipt(hash: Hex, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      return receipt;
    } catch {
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }
  throw new Error(`tx not mined after ${maxAttempts * 5}s: ${hash}`);
}

async function send(address: Address, abi: any, functionName: string, args: any[] = []) {
  const hash = await walletClient.writeContract({ address, abi, functionName, args } as any);
  log(`  tx: ${hash}`);
  const receipt = await waitForReceipt(hash);
  if (receipt.status !== "success") throw new Error(`tx reverted: ${hash}`);
  return receipt;
}

async function main() {
  log(`KelpDAO Exploit Replay`);
  log(`attacker: ${account.address}`);
  log(`bridge: ${BRIDGE}`);
  log(`lending: ${LENDING}`);
  log(`rsETH: ${RSETH}`);
  console.log("─".repeat(60));

  // Step 0: Unpause if paused (for re-runnability)
  const isPaused = await publicClient.readContract({
    address: LENDING,
    abi: MockLendingABI,
    functionName: "paused",
  });
  if (isPaused) {
    log("Step 0: Unpausing lending contract...");
    await send(LENDING, MockLendingABI, "unpause");
    log("  ✓ Lending unpaused");
  }

  // Step 1: Set 1-of-1 DVN (weak bridge config)
  log("Step 1: Setting 1-of-1 DVN on bridge (weak config)...");
  const maliciousDvn = ("0x" + keccak256(toHex("malicious-dvn")).slice(26)) as Address;
  await send(BRIDGE, MockOFTBridgeABI, "setDVN", [1, [maliciousDvn]]);
  log("  ✓ Bridge DVN set to 1-of-1 → Config Agent should flag HIGH RISK");

  // Step 2: Mint 116,500 rsETH via bridge
  log("Step 2: Minting 116,500 rsETH via bridge...");
  await send(BRIDGE, MockOFTBridgeABI, "mint", [account.address, DEPOSIT_AMOUNT]);
  const balance = await publicClient.readContract({
    address: RSETH,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  log(`  ✓ rsETH balance: ${formatEther(balance)}`);

  // Step 3: Approve + deposit rsETH into lending
  log("Step 3: Depositing 116,500 rsETH into lending...");
  await send(RSETH, ERC20ABI, "approve", [LENDING, DEPOSIT_AMOUNT]);
  await send(LENDING, MockLendingABI, "deposit", [DEPOSIT_AMOUNT]);
  log("  ✓ Deposited → Anomaly Agent watching for borrow...");

  // Step 4: Borrow max WETH at 80% LTV
  log("Step 4: Borrowing 93,200 WETH at 80% LTV...");
  await send(LENDING, MockLendingABI, "borrow", [BORROW_AMOUNT]);
  log("  ✓ Borrowed 93,200 WETH → Anomaly Agent should trigger CRITICAL alert");

  console.log("─".repeat(60));
  log("EXPLOIT REPLAY COMPLETE");
  log("Agents should now detect and score this within seconds.");
  log("Check Risk Agent: curl http://localhost:4000/status");
  log(`Total time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error("[demo] fatal:", err);
  process.exit(1);
});
