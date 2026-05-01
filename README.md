# Bridge Sentinel

A 3-agent swarm that replays the KelpDAO bridge exploit on a public testnet and proves it would have been detected and paused in under 2 minutes.

**Live demo:** [bridge-sentinel.vercel.app](https://bridge-sentinel.vercel.app)

---

## What it does

KelpDAO lost $3M because their LayerZero bridge had a 1-of-1 DVN config — one compromised validator could mint unlimited tokens. Bridge Sentinel runs three independent agents that would have caught this:

1. **Config Agent** — polls the bridge contract every 15s and scores the DVN setup (1-of-1 = 2/10, 2-of-3 = 7/10, etc.)
2. **Anomaly Agent** — watches `MockLending` for unusual deposit + high-LTV borrow patterns from the same wallet
3. **Risk Agent** — receives signals from both agents, runs LLM inference via **0G Compute** (`qwen-2.5-7b-instruct`), and serves a dashboard API

Agents communicate via **Gensyn AXL** (signed peer-to-peer transport). Contract addresses and monitoring config are resolved from **ENS** at startup — no hardcoded values.

The dashboard has a **Pause** button that calls `pause()` on the lending contract via the connected wallet when risk score >= 7.

---

## Architecture

```
Sepolia / 0G Testnet contracts
  MockOFTBridge  ──────────►  Config Agent  ──[AXL]──►
  MockLending    ──────────►  Anomaly Agent ──[AXL]──►  Risk Agent  ──►  Dashboard
                                                              │
                                                         0G Compute
                                                    (qwen-2.5-7b-instruct)

ENS (Sepolia): bridgesentinel.eth
  config.bridgesentinel.eth    → agent pubkey, endpoint
  anomaly.bridgesentinel.eth   → agent pubkey, endpoint
  risk.bridgesentinel.eth      → agent pubkey, endpoint
  kelpdao.bridgesentinel.eth   → monitored.bridge, monitored.lending, pause.threshold
```

---

## Deployed contracts (0G testnet, chain 16602)

| Contract | Address |
|----------|---------|
| MockOFTBridge | `0xD2efb57cFA2a7626d520C45a8304AD3162FE32Af` |
| MockLending | `0xD46bBD0362b1F8feb764366805F98f8782Ab81DA` |
| FakeRsETH | `0x2b54FeC881C9230A2740Bef0E1d91E50Eb483ca1` |
| MockWETH | `0x7740B82991d0c659A370EF82a4910E0e914C4253` |

---

## Sponsors

| Track | Integration |
|-------|------------|
| **Gensyn AXL** | Signed P2P transport between agents (`agents/transport/src/axl.ts`). Each agent has an AXL sidecar node. Receiver verifies `X-From-Peer-Id` against ENS-stored pubkeys. |
| **0G Compute** | Risk Agent LLM inference via `@0glabs/0g-serving-broker`. Model: `qwen-2.5-7b-instruct`. TEE attestation via `ZG-Res-Key` header. Falls back to rule-based scoring if provider not configured. |
| **ENS** | Agent identity, per-protocol monitoring config, and AXL pubkey discovery. All agents resolve contract addresses and thresholds from ENS at startup. Dashboard renders `kelpdao.bridgesentinel.eth` text records live. |

---

## How to run

Copy `.env.example` to `.env` in each relevant folder and fill in the values.

### 1. Frontend dashboard

```bash
cd frontend
pnpm install
pnpm dev        # http://localhost:3000
```

Required env vars (copy to `frontend/.env.local`):
```
NEXT_PUBLIC_RISK_AGENT_URL=http://localhost:4000
NEXT_PUBLIC_LENDING_ADDRESS=0xD46bBD0362b1F8feb764366805F98f8782Ab81DA
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your id from cloud.walletconnect.com>
NEXT_PUBLIC_ENS_NAME=bridgesentinel.eth
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

### 2. Risk Agent

```bash
cd agents/risk
pnpm install
pnpm dev        # http://localhost:4000
```

Required env vars (`agents/risk/.env`):
```
ZG_PRIVATE_KEY=0x...          # 0G wallet with testnet tokens
ZG_PROVIDER_ADDRESS=0x...     # from 0G Compute provider list
ZG_MODEL=qwen-2.5-7b-instruct
RISK_AGENT_PORT=4000
```

### 3. Config Agent

```bash
cd agents/config
pnpm install
pnpm dev
```

Required env vars (`agents/config/.env`):
```
RPC_URL=https://evmrpc-testnet.0g.ai
MOCK_BRIDGE_ADDRESS=0xD2efb57cFA2a7626d520C45a8304AD3162FE32Af
RISK_AGENT_URL=http://localhost:4000/signal
ENS_NAME=bridgesentinel.eth
SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

### 4. Anomaly Agent

```bash
cd agents/anomaly
pnpm install
pnpm dev
```

Required env vars (`agents/anomaly/.env`):
```
RPC_URL=https://evmrpc-testnet.0g.ai
MOCK_LENDING_ADDRESS=0xD46bBD0362b1F8feb764366805F98f8782Ab81DA
RISK_AGENT_URL=http://localhost:4000/signal
ENS_NAME=bridgesentinel.eth
SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

### 5. KelpDAO replay demo script

```bash
cd scripts/demo
pnpm install
pnpm dev
```

Required env vars (`scripts/demo/.env`):
```
RPC_URL=https://evmrpc-testnet.0g.ai
DEPLOYER_PRIVATE_KEY=0x...
MOCK_BRIDGE_ADDRESS=0xD2efb57cFA2a7626d520C45a8304AD3162FE32Af
MOCK_LENDING_ADDRESS=0xD46bBD0362b1F8feb764366805F98f8782Ab81DA
FAKE_RSETH_ADDRESS=0x2b54FeC881C9230A2740Bef0E1d91E50Eb483ca1
MOCK_WETH_ADDRESS=0x7740B82991d0c659A370EF82a4910E0e914C4253
```

### 6. AXL sidecar nodes (optional, for P2P transport)

Build the AXL binary:
```bash
git clone https://github.com/gensyn-ai/axl.git
cd axl && go build -o node ./cmd/node/
```

Generate keypairs (one per agent):
```bash
openssl genpkey -algorithm ed25519 -out axl/private-config.pem
openssl genpkey -algorithm ed25519 -out axl/private-anomaly.pem
openssl genpkey -algorithm ed25519 -out axl/private-risk.pem
```

Start one sidecar per agent with its own `node-config.json` (ports: Config=9002, Anomaly=9012, Risk=9022). Set `USE_AXL=true` in each agent's `.env` to switch from LocalTransport to AxlTransport.

### 7. ENS setup script

One-time setup — registers subnames and sets text records on Sepolia:

```bash
cd scripts/setup-ens
pnpm install
pnpm dev
```

Required env vars (`scripts/setup-ens/.env`):
```
SEPOLIA_RPC_URL=https://rpc.sepolia.org
DEPLOYER_PRIVATE_KEY=0x...     # wallet that owns bridgesentinel.eth on Sepolia
ENS_NAME=bridgesentinel.eth
MOCK_BRIDGE_ADDRESS=0xD2efb57cFA2a7626d520C45a8304AD3162FE32Af
MOCK_LENDING_ADDRESS=0xD46bBD0362b1F8feb764366805F98f8782Ab81DA
```

---

## Full demo run order

1. Start Risk Agent (`agents/risk`)
2. Start Config Agent (`agents/config`)
3. Start Anomaly Agent (`agents/anomaly`)
4. Open dashboard (`frontend`) — agents should show online within 2s
5. Click **Run KelpDAO Replay** — or run `scripts/demo` in a separate terminal
6. Watch Config Agent flag `1-of-1 DVN` (score 2/10)
7. Watch Anomaly Agent detect the deposit + max-borrow pattern
8. Watch Risk Agent score the scenario 9+/10 with LLM explanation
9. Click **Pause Protocol** in the dashboard — `pause()` tx lands on 0G testnet

---

## Contracts

Built with Foundry. 39 tests passing.

```bash
cd contracts
forge build
forge test
```
