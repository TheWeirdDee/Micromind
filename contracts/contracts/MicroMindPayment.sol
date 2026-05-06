// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MicroMindPayment is Ownable, ReentrancyGuard {
    IERC20 public immutable cUSD;
    
    uint8 public constant TOOL_CHAT   = 0;
    uint8 public constant TOOL_RESUME = 1;
    uint8 public constant TOOL_TWEET  = 2;
    uint8 public constant TOOL_BIO    = 3;
    
    mapping(uint8 => uint256) public toolPrices;
    mapping(address => uint256) public totalSpent;
    mapping(bytes32 => bool) public promptPaid;
    
    event PromptPaid(
        address indexed user,
        uint8 indexed toolId,
        bytes32 promptHash,
        uint256 amount,
        uint256 timestamp
    );
    
    constructor(address _cUSD) Ownable(msg.sender) {
        cUSD = IERC20(_cUSD);
        toolPrices[TOOL_CHAT]   = 10000000000000000;  // 0.01 cUSD
        toolPrices[TOOL_RESUME] = 50000000000000000;  // 0.05 cUSD
        toolPrices[TOOL_TWEET]  = 10000000000000000;  // 0.01 cUSD
        toolPrices[TOOL_BIO]    = 20000000000000000;  // 0.02 cUSD
    }
    
    function payForPrompt(uint8 toolId, bytes32 promptHash)
        external nonReentrant {
        require(toolId <= TOOL_BIO, "Invalid tool");
        require(!promptPaid[promptHash], "Already paid");
        uint256 price = toolPrices[toolId];
        require(price > 0, "Tool not priced");
        promptPaid[promptHash] = true;
        totalSpent[msg.sender] += price;
        require(
            cUSD.transferFrom(msg.sender, address(this), price),
            "Payment failed"
        );
        emit PromptPaid(
            msg.sender, toolId, promptHash, price, block.timestamp
        );
    }
    
    function setToolPrice(uint8 toolId, uint256 price) 
        external onlyOwner {
        toolPrices[toolId] = price;
    }
    
    function withdraw(uint256 amount) external onlyOwner {
        require(cUSD.transfer(owner(), amount), "Failed");
    }
    
    function getToolPrice(uint8 toolId) 
        external view returns (uint256) {
        return toolPrices[toolId];
    }
    
    function getBalance() external view returns (uint256) {
        return cUSD.balanceOf(address(this));
    }
    
    function getTotalSpent(address user) 
        external view returns (uint256) {
        return totalSpent[user];
    }
}
