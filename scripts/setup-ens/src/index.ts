import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  namehash,
  labelhash,
  encodeFunctionData,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as Hex;
const ENS_NAME = process.env.ENS_NAME || "bridgesentinel.eth";
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

const BRIDGE_ADDRESS = process.env.MOCK_BRIDGE_ADDRESS || "";
const LENDING_ADDRESS = process.env.MOCK_LENDING_ADDRESS || "";
const AXL_CONFIG_PUBKEY = process.env.AXL_CONFIG_PUBKEY || "";
const AXL_ANOMALY_PUBKEY = process.env.AXL_ANOMALY_PUBKEY || "";
const AXL_RISK_PUBKEY = process.env.AXL_RISK_PUBKEY || "";

if (!PRIVATE_KEY) {
  console.error("[setup-ens] DEPLOYER_PRIVATE_KEY is required");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: sepolia, transport: http(RPC_URL) });

// ENS Registry and Resolver on Sepolia
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as Address;
const PUBLIC_RESOLVER = "0x8FADE66B79cC9f1C6F971901BaD22D7FE7E9C0aE" as Address;

const REGISTRY_ABI = [
  {
    type: "function",
    name: "setSubnodeRecord",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "label", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

const RESOLVER_ABI = [
  {
    type: "function",
    name: "setText",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "multicall",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]" }],
    stateMutability: "nonpayable",
  },
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

function log(msg: string) {
  console.log(`[setup-ens] ${msg}`);
}

async function createSubname(parent: string, label: string): Promise<string> {
  const parentNode = namehash(parent);
  const fullName = `${label}.${parent}`;
  const node = namehash(fullName);

  const currentOwner = await publicClient.readContract({
    address: ENS_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "owner",
    args: [node],
  });

  if (currentOwner.toLowerCase() === account.address.toLowerCase()) {
    log(`  subname ${fullName} already exists, skipping creation`);
    return fullName;
  }

  const hash = await walletClient.writeContract({
    address: ENS_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "setSubnodeRecord",
    args: [parentNode, labelhash(label), account.address, PUBLIC_RESOLVER, BigInt(0)],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  log(`  ✓ created ${fullName} (tx: ${hash})`);
  return fullName;
}

async function setTextRecords(name: string, records: Record<string, string>) {
  const node = namehash(name);
  const calls = Object.entries(records).map(([key, value]) =>
    encodeFunctionData({
      abi: RESOLVER_ABI,
      functionName: "setText",
      args: [node, key, value],
    }),
  );

  if (calls.length === 0) return;

  const hash = await walletClient.writeContract({
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "multicall",
    args: [calls],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  log(`  ✓ set ${calls.length} text records on ${name}`);
}

async function main() {
  log(`Setting up ENS for ${ENS_NAME}`);
  log(`owner: ${account.address}`);

  // Verify we own the parent name
  const parentNode = namehash(ENS_NAME);
  const parentOwner = await publicClient.readContract({
    address: ENS_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "owner",
    args: [parentNode],
  });
  if (parentOwner.toLowerCase() !== account.address.toLowerCase()) {
    log(`ERROR: ${account.address} does not own ${ENS_NAME}`);
    log(`Current owner: ${parentOwner}`);
    log(`Register ${ENS_NAME} on Sepolia first at https://app.ens.domains`);
    process.exit(1);
  }
  log(`✓ Confirmed ownership of ${ENS_NAME}`);

  // Create agent subnames
  log("\nCreating agent subnames...");
  const configName = await createSubname(ENS_NAME, "config");
  const anomalyName = await createSubname(ENS_NAME, "anomaly");
  const riskName = await createSubname(ENS_NAME, "risk");

  // Create protocol subname
  log("\nCreating protocol subname...");
  const protocolName = await createSubname(ENS_NAME, "kelpdao");

  // Set agent text records
  log("\nSetting agent text records...");

  await setTextRecords(configName, {
    "agent.role": "config",
    "agent.version": "0.1.0",
    "agent.axl_pubkey": AXL_CONFIG_PUBKEY,
    "agent.endpoint": "http://localhost:4001",
  });

  await setTextRecords(anomalyName, {
    "agent.role": "anomaly",
    "agent.version": "0.1.0",
    "agent.axl_pubkey": AXL_ANOMALY_PUBKEY,
    "agent.endpoint": "http://localhost:4002",
  });

  await setTextRecords(riskName, {
    "agent.role": "risk",
    "agent.version": "0.1.0",
    "agent.axl_pubkey": AXL_RISK_PUBKEY,
    "agent.endpoint": "http://localhost:4000",
  });

  // Set protocol monitoring config
  log("\nSetting protocol monitoring config...");
  await setTextRecords(protocolName, {
    "monitored.bridge": BRIDGE_ADDRESS,
    "monitored.lending": LENDING_ADDRESS,
    "pause.threshold": "8",
    "alert.channel": "dashboard",
  });

  // Verify by reading back
  log("\nVerifying text records...");
  for (const [name, key] of [
    [configName, "agent.role"],
    [anomalyName, "agent.role"],
    [riskName, "agent.role"],
    [protocolName, "monitored.bridge"],
    [protocolName, "pause.threshold"],
  ] as const) {
    const value = await publicClient.readContract({
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "text",
      args: [namehash(name), key],
    });
    log(`  ${name} → ${key} = "${value}"`);
  }

  log("\n✓ ENS setup complete!");
}

main().catch((err) => {
  console.error("[setup-ens] fatal:", err);
  process.exit(1);
});
