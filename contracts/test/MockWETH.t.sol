// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockWETH.sol";

contract MockWETHTest is Test {
    MockWETH token;
    address alice = makeAddr("alice");

    function setUp() public {
        token = new MockWETH();
    }

    function test_name() public view {
        assertEq(token.name(), "Mock WETH");
    }

    function test_symbol() public view {
        assertEq(token.symbol(), "WETH");
    }

    function test_decimals() public view {
        assertEq(token.decimals(), 18);
    }

    function test_mint() public {
        token.mint(alice, 1000e18);
        assertEq(token.balanceOf(alice), 1000e18);
    }

    function test_anyone_can_mint() public {
        vm.prank(alice);
        token.mint(alice, 500e18);
        assertEq(token.balanceOf(alice), 500e18);
    }
}
