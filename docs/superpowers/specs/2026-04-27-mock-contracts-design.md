# Mock Contracts Design — Bridge Sentinel

## Overview

5 Solidity contracts deployed via Foundry on Sepolia to simulate the KelpDAO exploit scenario. The agent swarm (Config, Anomaly, Risk) monitors these contracts. The contracts are intentionally minimal — no oracles, no interest, no receipt tokens.

## Contracts

### FakeRsETH

- ERC-20: name "Fake rsETH", symbol "rsETH", 18 decimals
- Open `mint(address to, uint256 amount)` — no access control
- No other custom logic

### MockWETH

- ERC-20: name "Mock WETH", symbol "WETH", 18 decimals
- Open `mint(address to, uint256 amount)` — no access control
- No other custom logic

### MockOFTBridge

- Constructor takes `address _rsETH` (FakeRsETH address)
- State: `rsETH` address, `uint8 requiredDVNs`, `address[] dvns`
- `setDVN(uint8 required, address[] calldata _dvns)` — open, no access control. Emits `DVNConfigUpdated(uint8 required, address[] dvns)`
- `mint(address to, uint256 amount)` — calls `FakeRsETH.mint(to, amount)`, emits `BridgeMessageReceived(address indexed to, uint256 amount)`. Open, no access control.
- `getDVNConfig() view returns (uint8, address[])` — read function for Config Agent polling

### MockLending

- Constructor takes `address _depositAsset` (FakeRsETH), `address _borrowAsset` (MockWETH), `uint256 _ltvBps` (basis points, initially 8000 = 80%). Deployer becomes owner.
- Roles: `owner` (full control), `guardian` (can pause/unpause). Set via `setGuardian(address)` (onlyOwner).
- `setLTV(uint256 _ltvBps)` — onlyOwner
- State: `mapping(address => uint256) deposits`, `mapping(address => uint256) borrows`, `uint256 totalDeposits`, `uint256 totalBorrows`, `bool paused`
- `deposit(uint256 amount)` — whenNotPaused. Transfers rsETH from caller via `transferFrom`. Updates `deposits[msg.sender]` and `totalDeposits`. Emits `Deposit(address indexed user, address indexed asset, uint256 amount)`.
- `borrow(uint256 amount)` — whenNotPaused. Checks `borrows[msg.sender] + amount <= deposits[msg.sender] * ltvBps / 10000`. Assumes 1:1 rsETH:WETH price ratio (no oracle). Transfers WETH to caller. Updates `borrows[msg.sender]` and `totalBorrows`. Emits `Borrow(address indexed user, address indexed asset, uint256 amount)`.
- `pause()` / `unpause()` — callable by owner OR guardian. Emits `Paused(address indexed by)` / `Unpaused(address indexed by)`.

### Events Summary

| Contract | Event | Indexed Fields |
|----------|-------|----------------|
| MockOFTBridge | `DVNConfigUpdated(uint8 required, address[] dvns)` | none |
| MockOFTBridge | `BridgeMessageReceived(address indexed to, uint256 amount)` | to |
| MockLending | `Deposit(address indexed user, address indexed asset, uint256 amount)` | user, asset |
| MockLending | `Borrow(address indexed user, address indexed asset, uint256 amount)` | user, asset |
| MockLending | `Paused(address indexed by)` | by |
| MockLending | `Unpaused(address indexed by)` | by |

## Scripts

### Deploy.s.sol

1. Deploy FakeRsETH
2. Deploy MockWETH
3. Deploy MockOFTBridge(rsETH)
4. Deploy MockLending(rsETH, weth, 8000)
5. Set guardian on MockLending (from `GUARDIAN_ADDRESS` env var, defaults to deployer)
6. Mint 200,000 WETH to MockLending (initial borrow liquidity)
7. Write addresses to `contracts/deployments/sepolia.json`

Output format:
```json
{
  "fakeRsETH": "0x...",
  "mockWETH": "0x...",
  "mockOFTBridge": "0x...",
  "mockLending": "0x...",
  "chainId": 11155111
}
```

ABIs are available in Foundry's `out/` directory — agents reference those directly.

### Simulate.s.sol (KelpDAO Replay)

1. `bridge.setDVN(1, [single_address])` — 1-of-1 DVN config
2. `bridge.mint(attacker, 116_500e18)` — 116.5k rsETH to attacker
3. Attacker approves MockLending for rsETH
4. `lending.deposit(116_500e18)` — attacker deposits all
5. `lending.borrow(93_200e18)` — 80% LTV borrow (116,500 * 0.8)

Attacker address from `ATTACKER_PRIVATE_KEY` env var or defaults to deployer.

## Design Decisions

- **Open mint on FakeRsETH/MockWETH/MockOFTBridge**: Demo convenience — no access control needed since these are test-only contracts.
- **1:1 price ratio**: No oracle contract needed. The borrow check is just `deposit * LTV%`.
- **Guardian role**: Lets the dashboard wallet pause without being the deployer.
- **Basis points for LTV**: Configurable via `setLTV()`, initialized at 8000 (80%).
- **No interest/receipt tokens/health factors**: Agents only need deposit/borrow events with amounts. Lending market fidelity doesn't affect the demo story.

## Dependencies

- Foundry (forge 1.5.1+ installed)
- OpenZeppelin Contracts (ERC20, Ownable) via `forge install`
