// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MicroMindPayment is Ownable, ReentrancyGuard {
    
    uint8 public constant TOOL_CHAT   = 0;
    uint8 public constant TOOL_RESUME = 1;
    uint8 public constant TOOL_TWEET  = 2;
    uint8 public constant TOOL_BIO    = 3;
    
    mapping(uint8 => uint256) public toolPrices;
    mapping(bytes32 => bool) public promptPaid;
    mapping(address => uint256) public totalSpent;
    
    event PromptPaid(
        address indexed user,
        uint8 indexed toolId,
        bytes32 promptHash,
        uint256 amount,
        uint256 timestamp
    );
    
    constructor() Ownable(msg.sender) {
        // Prices in CELO wei (18 decimals)
        // Keeping same USD value as before since 1 CELO ≈ $0.09
        // So 0.01 cUSD ≈ 0.11 CELO, but let's use simple round numbers
        toolPrices[TOOL_CHAT]   = 0.001 ether;  // 0.001 CELO (~$0.0001)
        toolPrices[TOOL_RESUME] = 0.005 ether;  // 0.005 CELO
        toolPrices[TOOL_TWEET]  = 0.001 ether;  // 0.001 CELO
        toolPrices[TOOL_BIO]    = 0.002 ether;  // 0.002 CELO
    }
    
    function payForPrompt(
        uint8 toolId,
        bytes32 promptHash
    ) external payable nonReentrant {
        require(toolId <= TOOL_BIO, "Invalid tool");
        require(!promptPaid[promptHash], "Already paid");
        require(msg.value >= toolPrices[toolId], "Insufficient payment");
        
        promptPaid[promptHash] = true;
        totalSpent[msg.sender] += msg.value;
        
        // Refund excess payment
        if (msg.value > toolPrices[toolId]) {
            payable(msg.sender).transfer(
                msg.value - toolPrices[toolId]
            );
        }
        
        emit PromptPaid(
            msg.sender,
            toolId,
            promptHash,
            toolPrices[toolId],
            block.timestamp
        );
    }
    
    function setToolPrice(
        uint8 toolId, 
        uint256 price
    ) external onlyOwner {
        require(toolId <= TOOL_BIO, "Invalid tool");
        toolPrices[toolId] = price;
    }
    
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    function getToolPrice(
        uint8 toolId
    ) external view returns (uint256) {
        return toolPrices[toolId];
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
