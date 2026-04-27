// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FakeRsETH.sol";
import "../src/MockWETH.sol";
import "../src/MockOFTBridge.sol";
import "../src/MockLending.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address guardian = vm.envOr("GUARDIAN_ADDRESS", vm.addr(deployerKey));

        vm.startBroadcast(deployerKey);

        FakeRsETH rsETH = new FakeRsETH();
        MockWETH weth = new MockWETH();
        MockOFTBridge bridge = new MockOFTBridge(address(rsETH));
        MockLending lending = new MockLending(address(rsETH), address(weth), 8000);

        lending.setGuardian(guardian);

        // Seed lending pool with 200k WETH liquidity
        weth.mint(address(lending), 200_000e18);

        vm.stopBroadcast();

        // Write deployment addresses to JSON
        string memory json = "deploy";
        vm.serializeAddress(json, "fakeRsETH", address(rsETH));
        vm.serializeAddress(json, "mockWETH", address(weth));
        vm.serializeAddress(json, "mockOFTBridge", address(bridge));
        vm.serializeAddress(json, "mockLending", address(lending));
        string memory output = vm.serializeUint(json, "chainId", block.chainid);
        vm.writeJson(output, "deployments/sepolia.json");
    }
}
