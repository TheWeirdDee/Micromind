// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MicroMindPayment is Ownable, ReentrancyGuard {
    IERC20 public immutable paymentToken;

    uint8 public constant TOOL_CHAT   = 0;
    uint8 public constant TOOL_RESUME = 1;
    uint8 public constant TOOL_TWEET  = 2;
    uint8 public constant TOOL_BIO    = 3;

    // Prices in USDC (6 decimals)
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

    // USDC on Celo Mainnet: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
    constructor(address _token) Ownable(msg.sender) {
        paymentToken = IERC20(_token);
        // Prices in USDC (6 decimals)
        toolPrices[TOOL_CHAT]   = 10000;  // 0.01 USDC
        toolPrices[TOOL_RESUME] = 50000;  // 0.05 USDC
        toolPrices[TOOL_TWEET]  = 10000;  // 0.01 USDC
        toolPrices[TOOL_BIO]    = 20000;  // 0.02 USDC
    }

    function payForPrompt(
        uint8 toolId,
        bytes32 promptHash
    ) external nonReentrant {
        require(toolId <= TOOL_BIO, "Invalid tool");
        require(!promptPaid[promptHash], "Already paid");
        uint256 price = toolPrices[toolId];
        require(price > 0, "Tool not priced");
        promptPaid[promptHash] = true;
        totalSpent[msg.sender] += price;
        require(
            paymentToken.transferFrom(
                msg.sender,
                address(this),
                price
            ),
            "Payment failed"
        );
        emit PromptPaid(
            msg.sender,
            toolId,
            promptHash,
            price,
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

    function withdraw(uint256 amount) external onlyOwner {
        require(
            paymentToken.transfer(owner(), amount),
            "Withdraw failed"
        );
    }

    function getToolPrice(
        uint8 toolId
    ) external view returns (uint256) {
        return toolPrices[toolId];
    }

    function getBalance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }

    function getTotalSpent(
        address user
    ) external view returns (uint256) {
        return totalSpent[user];
    }
}
