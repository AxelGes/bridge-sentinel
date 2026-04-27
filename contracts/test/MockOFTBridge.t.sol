// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockOFTBridge.sol";
import "../src/FakeRsETH.sol";

contract MockOFTBridgeTest is Test {
    MockOFTBridge bridge;
    FakeRsETH rsETH;
    address alice = makeAddr("alice");
    address dvn1 = makeAddr("dvn1");
    address dvn2 = makeAddr("dvn2");

    function setUp() public {
        rsETH = new FakeRsETH();
        bridge = new MockOFTBridge(address(rsETH));
    }

    function test_constructor_sets_rsETH() public view {
        assertEq(address(bridge.rsETH()), address(rsETH));
    }

    function test_initial_dvn_config_empty() public view {
        (uint8 required, address[] memory dvns) = bridge.getDVNConfig();
        assertEq(required, 0);
        assertEq(dvns.length, 0);
    }

    function test_setDVN_single() public {
        address[] memory dvns = new address[](1);
        dvns[0] = dvn1;
        bridge.setDVN(1, dvns);

        (uint8 required, address[] memory stored) = bridge.getDVNConfig();
        assertEq(required, 1);
        assertEq(stored.length, 1);
        assertEq(stored[0], dvn1);
    }

    function test_setDVN_emits_event() public {
        address[] memory dvns = new address[](1);
        dvns[0] = dvn1;

        vm.expectEmit(false, false, false, true);
        emit MockOFTBridge.DVNConfigUpdated(1, dvns);
        bridge.setDVN(1, dvns);
    }

    function test_setDVN_anyone_can_call() public {
        address[] memory dvns = new address[](1);
        dvns[0] = dvn1;

        vm.prank(alice);
        bridge.setDVN(1, dvns);

        (uint8 required, ) = bridge.getDVNConfig();
        assertEq(required, 1);
    }

    function test_setDVN_overwrite() public {
        address[] memory dvns1 = new address[](1);
        dvns1[0] = dvn1;
        bridge.setDVN(1, dvns1);

        address[] memory dvns2 = new address[](2);
        dvns2[0] = dvn1;
        dvns2[1] = dvn2;
        bridge.setDVN(2, dvns2);

        (uint8 required, address[] memory stored) = bridge.getDVNConfig();
        assertEq(required, 2);
        assertEq(stored.length, 2);
    }

    function test_mint_mints_rsETH() public {
        bridge.mint(alice, 1000e18);
        assertEq(rsETH.balanceOf(alice), 1000e18);
    }

    function test_mint_emits_event() public {
        vm.expectEmit(true, false, false, true);
        emit MockOFTBridge.BridgeMessageReceived(alice, 1000e18);
        bridge.mint(alice, 1000e18);
    }

    function test_mint_anyone_can_call() public {
        vm.prank(alice);
        bridge.mint(alice, 500e18);
        assertEq(rsETH.balanceOf(alice), 500e18);
    }
}
