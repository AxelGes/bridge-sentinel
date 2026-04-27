// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/FakeRsETH.sol";
import "../src/MockWETH.sol";
import "../src/MockOFTBridge.sol";
import "../src/MockLending.sol";

contract SimulateTest is Test {
    FakeRsETH rsETH;
    MockWETH weth;
    MockOFTBridge bridge;
    MockLending lending;

    address deployer = makeAddr("deployer");
    address attacker = makeAddr("attacker");
    address dvn1 = makeAddr("dvn1");

    function setUp() public {
        vm.startPrank(deployer);
        rsETH = new FakeRsETH();
        weth = new MockWETH();
        bridge = new MockOFTBridge(address(rsETH));
        lending = new MockLending(address(rsETH), address(weth), 8000);
        weth.mint(address(lending), 200_000e18);
        vm.stopPrank();
    }

    function test_full_kelpdao_replay() public {
        // Step 1: Set 1-of-1 DVN
        address[] memory dvns = new address[](1);
        dvns[0] = dvn1;
        bridge.setDVN(1, dvns);

        (uint8 required, address[] memory stored) = bridge.getDVNConfig();
        assertEq(required, 1);
        assertEq(stored.length, 1);

        // Step 2: Bridge 116.5k rsETH to attacker
        bridge.mint(attacker, 116_500e18);
        assertEq(rsETH.balanceOf(attacker), 116_500e18);

        // Step 3: Attacker deposits all rsETH
        vm.startPrank(attacker);
        rsETH.approve(address(lending), 116_500e18);
        lending.deposit(116_500e18);
        assertEq(lending.deposits(attacker), 116_500e18);
        assertEq(lending.totalDeposits(), 116_500e18);

        // Step 4: Attacker borrows max (80% LTV = 93,200 WETH)
        lending.borrow(93_200e18);
        assertEq(lending.borrows(attacker), 93_200e18);
        assertEq(weth.balanceOf(attacker), 93_200e18);
        vm.stopPrank();

        // Step 5: Guardian pauses (simulating agent response)
        vm.prank(deployer);
        lending.pause();
        assertTrue(lending.paused());

        // Verify attacker can't borrow more
        vm.prank(attacker);
        vm.expectRevert("paused");
        lending.borrow(1e18);
    }
}
