// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockLending {
    address public owner;
    address public guardian;
    address public depositAsset;
    address public borrowAsset;
    uint256 public ltvBps;
    bool public paused;

    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrows;
    uint256 public totalDeposits;
    uint256 public totalBorrows;

    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Borrow(address indexed user, address indexed asset, uint256 amount);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || msg.sender == guardian, "not authorized");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    constructor(address _depositAsset, address _borrowAsset, uint256 _ltvBps) {
        owner = msg.sender;
        depositAsset = _depositAsset;
        borrowAsset = _borrowAsset;
        ltvBps = _ltvBps;
    }

    function setGuardian(address _guardian) external onlyOwner {
        guardian = _guardian;
    }

    function setLTV(uint256 _ltvBps) external onlyOwner {
        ltvBps = _ltvBps;
    }

    function deposit(uint256 amount) external whenNotPaused {
        IERC20(depositAsset).transferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        totalDeposits += amount;
        emit Deposit(msg.sender, depositAsset, amount);
    }

    function borrow(uint256 amount) external whenNotPaused {
        require(borrows[msg.sender] + amount <= deposits[msg.sender] * ltvBps / 10000, "exceeds LTV");
        borrows[msg.sender] += amount;
        totalBorrows += amount;
        IERC20(borrowAsset).transfer(msg.sender, amount);
        emit Borrow(msg.sender, borrowAsset, amount);
    }

    function pause() external onlyAuthorized {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyAuthorized {
        paused = false;
        emit Unpaused(msg.sender);
    }
}
