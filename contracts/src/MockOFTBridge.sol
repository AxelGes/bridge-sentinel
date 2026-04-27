// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FakeRsETH.sol";

contract MockOFTBridge {
    FakeRsETH public immutable rsETH;
    uint8 public requiredDVNs;
    address[] public dvns;

    event DVNConfigUpdated(uint8 required, address[] dvns);
    event BridgeMessageReceived(address indexed to, uint256 amount);

    constructor(address _rsETH) {
        rsETH = FakeRsETH(_rsETH);
    }

    function setDVN(uint8 required, address[] calldata _dvns) external {
        requiredDVNs = required;
        dvns = _dvns;
        emit DVNConfigUpdated(required, _dvns);
    }

    function mint(address to, uint256 amount) external {
        rsETH.mint(to, amount);
        emit BridgeMessageReceived(to, amount);
    }

    function getDVNConfig() external view returns (uint8, address[] memory) {
        return (requiredDVNs, dvns);
    }
}
