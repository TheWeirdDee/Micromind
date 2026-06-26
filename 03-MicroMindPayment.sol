// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MicroMindPayment
 * @notice Handles pay-per-prompt payments for MicroMind journal app on Celo.
 *         Users pay USDm for AI features. Payment is verified onchain by the
 *         agent backend before returning AI responses.
 *
 * Tool IDs:
 *   1 = Chat        (0.005 USDm)
 *   2 = Tweet       (0.005 USDm)
 *   3 = Reflect     (0.005 USDm)
 *   4 = Pattern     (0.005 USDm)
 *   5 = Letter      (0.010 USDm)
 *
 * Deployment: Celo Mainnet
 * USDm address: 0x765DE816845861e75A25fCA122bb6898B8B1282a
 */
contract MicroMindPayment is Ownable {

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public immutable USDm;

    /// @notice Prices in USDm (6 decimals — USDm uses 18 but we store as wei)
    mapping(uint8 => uint256) public toolPrices;

    /// @notice Total collected per tool
    mapping(uint8 => uint256) public totalCollected;

    /// @notice All-time total USDm collected
    uint256 public grandTotal;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted on every successful prompt payment.
    ///         The agent backend listens for this event to verify payment
    ///         before returning an AI response.
    event PromptPaid(
        address indexed user,
        uint8 indexed toolId,
        uint256 amount,
        bytes32 promptHash,
        uint256 timestamp
    );

    event PriceUpdated(uint8 indexed toolId, uint256 newPrice);
    event Withdrawn(address indexed to, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error InvalidTool(uint8 toolId);
    error ZeroPrice();
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _USDm) Ownable(msg.sender) {
        USDm = IERC20(_USDm);

        // 0.005 USDm = 5_000_000_000_000_000 wei (18 decimals)
        uint256 fiveMilli  = 5_000_000_000_000_000;
        // 0.010 USDm = 10_000_000_000_000_000 wei
        uint256 tenMilli   = 10_000_000_000_000_000;

        toolPrices[1] = fiveMilli;  // Chat
        toolPrices[2] = fiveMilli;  // Tweet
        toolPrices[3] = fiveMilli;  // Reflect
        toolPrices[4] = fiveMilli;  // Pattern
        toolPrices[5] = tenMilli;   // Letter (AI Polish)
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /**
     * @notice Pay for a prompt. User must have approved this contract to spend
     *         at least `toolPrices[toolId]` USDm before calling.
     *
     * @param toolId     ID of the tool being used (1–5)
     * @param promptHash keccak256 hash of the prompt string (for verification)
     */
    function payForPrompt(uint8 toolId, bytes32 promptHash) external {
        uint256 price = toolPrices[toolId];
        if (price == 0) revert InvalidTool(toolId);

        bool ok = USDm.transferFrom(msg.sender, address(this), price);
        if (!ok) revert TransferFailed();

        totalCollected[toolId] += price;
        grandTotal += price;

        emit PromptPaid(msg.sender, toolId, price, promptHash, block.timestamp);
    }

    // ─── Owner ────────────────────────────────────────────────────────────────

    /**
     * @notice Update price for a tool. Price must be > 0.
     * @param toolId   Tool ID to update
     * @param newPrice New price in USDm wei (18 decimals)
     */
    function setToolPrice(uint8 toolId, uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert ZeroPrice();
        toolPrices[toolId] = newPrice;
        emit PriceUpdated(toolId, newPrice);
    }

    /**
     * @notice Withdraw all collected USDm to owner wallet.
     */
    function withdraw() external onlyOwner {
        uint256 balance = USDm.balanceOf(address(this));
        bool ok = USDm.transfer(owner(), balance);
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner(), balance);
    }

    /**
     * @notice Withdraw specific amount of USDm to owner wallet.
     */
    function withdrawAmount(uint256 amount) external onlyOwner {
        bool ok = USDm.transfer(owner(), amount);
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner(), amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Get price for a specific tool.
     */
    function getPrice(uint8 toolId) external view returns (uint256) {
        return toolPrices[toolId];
    }

    /**
     * @notice Get current USDm balance held by contract.
     */
    function contractBalance() external view returns (uint256) {
        return USDm.balanceOf(address(this));
    }

    /**
     * @notice Get all tool prices at once.
     * @return prices Array of prices for tool IDs 1–5
     */
    function getAllPrices() external view returns (uint256[5] memory prices) {
        for (uint8 i = 1; i <= 5; i++) {
            prices[i - 1] = toolPrices[i];
        }
    }
}

/*
 * ─── DEPLOYMENT NOTES ─────────────────────────────────────────────────────────
 *
 * Network:      Celo Mainnet (Chain ID: 42220)
 * RPC:          https://forno.celo.org
 * USDm address: 0x765DE816845861e75A25fCA122bb6898B8B1282a
 *
 * Deploy steps (Hardhat):
 *   npx hardhat run scripts/deploy.js --network celo
 *
 * Verify on Celoscan:
 *   npx hardhat verify --network celo <DEPLOYED_ADDRESS> "0x765DE816845861e75A25fCA122bb6898B8B1282a"
 *
 * After deploy, update these files with new contract address:
 *   - src/lib/contract.ts          (CONTRACT_ADDRESS constant)
 *   - agent/src/lib/contract.ts    (CONTRACT_ADDRESS constant)
 *
 * Tool ID reference (for frontend constants/tools.ts):
 *   1 = chat
 *   2 = tweet
 *   3 = reflect
 *   4 = pattern
 *   5 = letter
 *
 * ─── HARDHAT CONFIG REFERENCE ─────────────────────────────────────────────────
 *
 * In hardhat.config.js, add Celo network:
 *
 *   networks: {
 *     celo: {
 *       url: "https://forno.celo.org",
 *       chainId: 42220,
 *       accounts: [process.env.PRIVATE_KEY],
 *     },
 *     alfajores: {
 *       url: "https://alfajores-forno.celo-testnet.org",
 *       chainId: 44787,
 *       accounts: [process.env.PRIVATE_KEY],
 *     }
 *   }
 *
 * ─── GAS MODEL — IMPORTANT ───────────────────────────────────────────────────
 *
 * Users pay gas in CELO (native token). This is intentional.
 *
 * Talent Protocol tracks CELO gas spend as a core onchain activity signal.
 * If users pay gas in USDm via feeCurrency, their CELO activity score stays
 * at zero and they rank lower on the leaderboard.
 *
 * Payment flow per prompt:
 *   1. User signs approve() — pays CELO gas
 *   2. User signs payForPrompt() — pays CELO gas + spends USDm to contract
 *   3. Agent verifies PromptPaid event, returns AI response
 *
 * Required user wallet balance:
 *   - USDm: enough for the tool price (0.005–0.010 USDm per prompt)
 *   - CELO: small amount for gas (~0.001 CELO per transaction, negligible)
 *
 * Frontend must check CELO balance on wallet connect and warn if zero:
 *   "You need a small amount of CELO for gas. Get CELO via MiniPay or
 *    any Celo exchange."
 *
 * Do NOT add feeCurrency to any writeContract calls in the frontend.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */
