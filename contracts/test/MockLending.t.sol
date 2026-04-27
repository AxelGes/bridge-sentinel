// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockLending.sol";
import "../src/FakeRsETH.sol";
import "../src/MockWETH.sol";

contract MockLendingTest is Test {
    MockLending lending;
    FakeRsETH rsETH;
    MockWETH weth;

    address owner = makeAddr("owner");
    address guardian = makeAddr("guardian");
    address attacker = makeAddr("attacker");
    address nobody = makeAddr("nobody");

    function setUp() public {
        rsETH = new FakeRsETH();
        weth = new MockWETH();

        vm.prank(owner);
        lending = new MockLending(address(rsETH), address(weth), 8000);

        // Seed lending pool with WETH liquidity
        weth.mint(address(lending), 200_000e18);

        // Give attacker some rsETH
        rsETH.mint(attacker, 116_500e18);
    }

    // --- Constructor ---

    function test_constructor() public view {
        assertEq(lending.depositAsset(), address(rsETH));
        assertEq(lending.borrowAsset(), address(weth));
        assertEq(lending.ltvBps(), 8000);
        assertEq(lending.owner(), owner);
    }

    // --- Guardian ---

    function test_setGuardian() public {
        vm.prank(owner);
        lending.setGuardian(guardian);
        assertEq(lending.guardian(), guardian);
    }

    function test_setGuardian_onlyOwner() public {
        vm.prank(nobody);
        vm.expectRevert();
        lending.setGuardian(guardian);
    }

    // --- LTV ---

    function test_setLTV() public {
        vm.prank(owner);
        lending.setLTV(9000);
        assertEq(lending.ltvBps(), 9000);
    }

    function test_setLTV_onlyOwner() public {
        vm.prank(nobody);
        vm.expectRevert();
        lending.setLTV(9000);
    }

    // --- Deposit ---

    function test_deposit() public {
        vm.startPrank(attacker);
        rsETH.approve(address(lending), 1000e18);
        lending.deposit(1000e18);
        vm.stopPrank();

        assertEq(lending.deposits(attacker), 1000e18);
        assertEq(lending.totalDeposits(), 1000e18);
        assertEq(rsETH.balanceOf(address(lending)), 1000e18);
    }

    function test_deposit_emits_event() public {
        vm.startPrank(attacker);
        rsETH.approve(address(lending), 1000e18);

        vm.expectEmit(true, true, false, true);
        emit MockLending.Deposit(attacker, address(rsETH), 1000e18);
        lending.deposit(1000e18);
        vm.stopPrank();
    }

    function test_deposit_reverts_when_paused() public {
        vm.prank(owner);
        lending.pause();

        vm.startPrank(attacker);
        rsETH.approve(address(lending), 1000e18);
        vm.expectRevert();
        lending.deposit(1000e18);
        vm.stopPrank();
    }

    // --- Borrow ---

    function test_borrow() public {
        vm.startPrank(attacker);
        rsETH.approve(address(lending), 116_500e18);
        lending.deposit(116_500e18);
        lending.borrow(93_200e18); // 80% LTV
        vm.stopPrank();

        assertEq(lending.borrows(attacker), 93_200e18);
        assertEq(lending.totalBorrows(), 93_200e18);
        assertEq(weth.balanceOf(attacker), 93_200e18);
    }

    function test_borrow_emits_event() public {
        vm.startPrank(attacker);
        rsETH.approve(address(lending), 116_500e18);
        lending.deposit(116_500e18);

        vm.expectEmit(true, true, false, true);
        emit MockLending.Borrow(attacker, address(weth), 93_200e18);
        lending.borrow(93_200e18);
        vm.stopPrank();
    }

    function test_borrow_reverts_over_ltv() public {
        vm.startPrank(attacker);
        rsETH.approve(address(lending), 116_500e18);
        lending.deposit(116_500e18);
        vm.expectRevert("exceeds LTV");
        lending.borrow(93_201e18); // 1 wei over 80% LTV
        vm.stopPrank();
    }

    function test_borrow_reverts_when_paused() public {
        vm.startPrank(attacker);
        rsETH.approve(address(lending), 116_500e18);
        lending.deposit(116_500e18);
        vm.stopPrank();

        vm.prank(owner);
        lending.pause();

        vm.prank(attacker);
        vm.expectRevert();
        lending.borrow(1000e18);
    }

    // --- Pause ---

    function test_pause_by_owner() public {
        vm.prank(owner);
        lending.pause();
        assertTrue(lending.paused());
    }

    function test_pause_by_guardian() public {
        vm.prank(owner);
        lending.setGuardian(guardian);

        vm.prank(guardian);
        lending.pause();
        assertTrue(lending.paused());
    }

    function test_pause_emits_event() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit MockLending.Paused(owner);
        lending.pause();
    }

    function test_pause_reverts_for_nobody() public {
        vm.prank(nobody);
        vm.expectRevert("not authorized");
        lending.pause();
    }

    function test_unpause() public {
        vm.startPrank(owner);
        lending.pause();
        lending.unpause();
        vm.stopPrank();
        assertFalse(lending.paused());
    }

    function test_unpause_emits_event() public {
        vm.startPrank(owner);
        lending.pause();

        vm.expectEmit(true, false, false, true);
        emit MockLending.Unpaused(owner);
        lending.unpause();
        vm.stopPrank();
    }

    function test_unpause_by_guardian() public {
        vm.prank(owner);
        lending.setGuardian(guardian);

        vm.prank(guardian);
        lending.pause();

        vm.prank(guardian);
        lending.unpause();
        assertFalse(lending.paused());
    }
}
