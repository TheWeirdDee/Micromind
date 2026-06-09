// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MicroMindPaymentCelo
 * @notice CELO-native version of MicroMindPayment. Same interface as the cUSD
 *         contract (tool IDs 1-5, getPrice, same events) but accepts native
 *         CELO instead of cUSD transferFrom.
 *
 * Tool IDs:
 *   1 = Chat     (0.01 CELO)
 *   2 = Tweet    (0.01 CELO)
 *   3 = Reflect  (0.01 CELO)
 *   4 = Pattern  (0.01 CELO)
 *   5 = Letter   (0.02 CELO)
 */
contract MicroMindPaymentCelo is Ownable {

    mapping(uint8 => uint256) public toolPrices;
    mapping(uint8 => uint256) public totalCollected;
    uint256 public grandTotal;

    event PromptPaid(
        address indexed user,
        uint8 indexed toolId,
        uint256 amount,
        bytes32 promptHash,
        uint256 timestamp
    );
    event PriceUpdated(uint8 indexed toolId, uint256 newPrice);
    event Withdrawn(address indexed to, uint256 amount);

    error InvalidTool(uint8 toolId);
    error ZeroPrice();
    error InsufficientPayment(uint256 sent, uint256 required);

    constructor() Ownable(msg.sender) {
        toolPrices[1] = 0.01 ether;
        toolPrices[2] = 0.01 ether;
        toolPrices[3] = 0.01 ether;
        toolPrices[4] = 0.01 ether;
        toolPrices[5] = 0.02 ether;
    }

    function payForPrompt(uint8 toolId, bytes32 promptHash) external payable {
        uint256 price = toolPrices[toolId];
        if (price == 0) revert InvalidTool(toolId);
        if (msg.value < price) revert InsufficientPayment(msg.value, price);

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        totalCollected[toolId] += price;
        grandTotal += price;

        emit PromptPaid(msg.sender, toolId, price, promptHash, block.timestamp);
    }

    function setToolPrice(uint8 toolId, uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert ZeroPrice();
        toolPrices[toolId] = newPrice;
        emit PriceUpdated(toolId, newPrice);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
        emit Withdrawn(owner(), balance);
    }

    function withdrawAmount(uint256 amount) external onlyOwner {
        payable(owner()).transfer(amount);
        emit Withdrawn(owner(), amount);
    }

    function getPrice(uint8 toolId) external view returns (uint256) {
        return toolPrices[toolId];
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getAllPrices() external view returns (uint256[5] memory prices) {
        for (uint8 i = 1; i <= 5; i++) {
            prices[i - 1] = toolPrices[i];
        }
    }
}
