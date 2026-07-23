// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MicroMindStaking
 * @notice Manages lossless USDm staking for the 30-Day Morning Pages Challenge.
 *         Users lock a stake to build a habit. If they complete the challenge,
 *         they earn rewards. Otherwise, they get their principal back.
 */
contract MicroMindStaking is Ownable {

    // ─── State Variables ──────────────────────────────────────────────────────

    IERC20 public immutable USDm;

    /// @notice Stake amount in USDm wei (18 decimals)
    uint256 public stakeAmount;

    /// @notice Duration of the challenge in days
    uint256 public challengeDuration;

    /// @notice Number of daily check-ins required to claim rewards
    uint256 public requiredCheckins;

    /// @notice Reward amount in USDm wei distributed to finishers
    uint256 public rewardAmount;

    /// @notice Total USDm currently locked as stakes
    uint256 public totalStaked;

    struct Challenge {
        uint256 startTime;
        uint16 checkInCount;
        bool active;
        bool claimed;
        // Terms snapshotted at startChallenge/startChallengeFor time. setParams()
        // must only affect challenges started AFTER the change — _checkIn and
        // _withdraw read exclusively from these fields, never from the mutable
        // global stakeAmount/challengeDuration/requiredCheckins/rewardAmount.
        uint256 stakedAmount;
        uint256 duration;
        uint256 requiredCheckinsSnapshot;
        uint256 rewardAmountSnapshot;
    }

    mapping(address => Challenge) public challenges;
    // Tracks if user checked in for a specific day index (0 to duration-1)
    mapping(address => mapping(uint256 => bool)) public checkedInDays;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ChallengeStarted(address indexed user, uint256 startTime, uint256 stakedAmount);
    event CheckedIn(address indexed user, uint256 indexed dayIndex, bytes32 entryHash, uint256 timestamp);
    event ChallengeEnded(address indexed user, uint16 checkInCount, bool completed, uint256 payoutAmount, uint256 timestamp);
    event RewardPoolFunded(address indexed owner, uint256 amount);
    event ParamsUpdated(uint256 stakeAmount, uint256 challengeDuration, uint256 requiredCheckins, uint256 rewardAmount);
    event Withdrawn(address indexed to, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error ChallengeAlreadyActive();
    error NoActiveChallenge();
    error ChallengeNotEnded();
    error AlreadyCheckedInToday();
    error DayIndexOutOfBounds();
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _USDm) Ownable(msg.sender) {
        USDm = IERC20(_USDm);

        // Default parameters:
        // Stake: 5.00 USDm (5 * 10^18)
        stakeAmount = 5_000_000_000_000_000_000;
        // Duration: 30 days
        challengeDuration = 30;
        // Required: 25 days (gives 5 days of slack)
        requiredCheckins = 25;
        // Reward: 0.50 USDm
        rewardAmount = 500_000_000_000_000_000;
    }

    // ─── User Interface ───────────────────────────────────────────────────────

    /**
     * @notice Join the challenge by locking `stakeAmount` USDm.
     */
    function startChallenge() external {
        _startChallenge(msg.sender);
    }

    /**
     * @notice Daily check-in by submitting entry hash.
     * @param entryHash Keccak256 hash of the journal entry (calculated client-side)
     */
    function checkIn(bytes32 entryHash) external {
        _checkIn(msg.sender, entryHash);
    }

    /**
     * @notice Withdraw stake at the end of the challenge.
     */
    function withdraw() external {
        _withdraw(msg.sender);
    }

    // ─── Relayer Interface (onlyOwner) ────────────────────────────────────────

    /**
     * @notice Start a challenge on behalf of a user.
     *         Requires user to have approved this contract to spend their USDm first.
     */
    function startChallengeFor(address user) external onlyOwner {
        _startChallenge(user);
    }

    /**
     * @notice Check in on behalf of a user. Called by the relayer after verifying signature.
     */
    function checkInFor(address user, bytes32 entryHash) external onlyOwner {
        _checkIn(user, entryHash);
    }

    /**
     * @notice Trigger withdrawal on behalf of a user.
     */
    function withdrawFor(address user) external onlyOwner {
        _withdraw(user);
    }

    // ─── Internal Functions ───────────────────────────────────────────────────

    function _startChallenge(address user) internal {
        if (challenges[user].active) revert ChallengeAlreadyActive();

        // Snapshot current terms — everything below reads these snapshotted
        // values, not the mutable globals, so a later setParams() call cannot
        // retroactively change the deal for a challenge already in progress.
        uint256 snapshotStake = stakeAmount;
        uint256 snapshotDuration = challengeDuration;
        uint256 snapshotRequiredCheckins = requiredCheckins;
        uint256 snapshotReward = rewardAmount;

        bool ok = USDm.transferFrom(user, address(this), snapshotStake);
        if (!ok) revert TransferFailed();

        totalStaked += snapshotStake;

        challenges[user] = Challenge({
            startTime: block.timestamp,
            checkInCount: 0,
            active: true,
            claimed: false,
            stakedAmount: snapshotStake,
            duration: snapshotDuration,
            requiredCheckinsSnapshot: snapshotRequiredCheckins,
            rewardAmountSnapshot: snapshotReward
        });

        // Reset check-in records for this challenge's snapshotted duration in case of re-entry
        for (uint256 i = 0; i < snapshotDuration; i++) {
            checkedInDays[user][i] = false;
        }

        emit ChallengeStarted(user, block.timestamp, snapshotStake);
    }

    function _checkIn(address user, bytes32 entryHash) internal {
        Challenge storage c = challenges[user];
        if (!c.active) revert NoActiveChallenge();

        uint256 elapsed = block.timestamp - c.startTime;
        uint256 dayIndex = elapsed / 1 days;

        if (dayIndex >= c.duration) revert DayIndexOutOfBounds();
        if (checkedInDays[user][dayIndex]) revert AlreadyCheckedInToday();

        checkedInDays[user][dayIndex] = true;
        c.checkInCount++;

        emit CheckedIn(user, dayIndex, entryHash, block.timestamp);
    }

    function _withdraw(address user) internal {
        Challenge storage c = challenges[user];
        if (!c.active) revert NoActiveChallenge();
        if (block.timestamp < c.startTime + (c.duration * 1 days)) revert ChallengeNotEnded();

        c.active = false;
        c.claimed = true;

        uint256 payout = c.stakedAmount;
        bool completed = c.checkInCount >= c.requiredCheckinsSnapshot;

        if (completed) {
            uint256 pool = rewardPoolBalance();
            uint256 rewardPayout = c.rewardAmountSnapshot;
            if (rewardPayout > pool) {
                rewardPayout = pool; // Cap at available reward pool to prevent revert and protect principal
            }
            payout += rewardPayout;
        }

        totalStaked -= c.stakedAmount;

        bool ok = USDm.transfer(user, payout);
        if (!ok) revert TransferFailed();

        emit ChallengeEnded(user, c.checkInCount, completed, payout, block.timestamp);
    }

    // ─── Owner functions ──────────────────────────────────────────────────────

    /**
     * @notice Fund the reward pool with USDm.
     */
    function fundRewardPool(uint256 amount) external {
        bool ok = USDm.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();
        emit RewardPoolFunded(msg.sender, amount);
    }

    /**
     * @notice Update challenge parameters.
     */
    function setParams(
        uint256 _stakeAmount,
        uint256 _challengeDuration,
        uint256 _requiredCheckins,
        uint256 _rewardAmount
    ) external onlyOwner {
        stakeAmount = _stakeAmount;
        challengeDuration = _challengeDuration;
        requiredCheckins = _requiredCheckins;
        rewardAmount = _rewardAmount;

        emit ParamsUpdated(_stakeAmount, _challengeDuration, _requiredCheckins, _rewardAmount);
    }

    /**
     * @notice Withdraw excess USDm (reward pool funds) to owner.
     */
    function withdrawExcess(uint256 amount) external onlyOwner {
        uint256 pool = rewardPoolBalance();
        require(amount <= pool, "Cannot withdraw active stakes");
        bool ok = USDm.transfer(owner(), amount);
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner(), amount);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Get available reward pool balance (total contract balance minus locked stakes)
     */
    function rewardPoolBalance() public view returns (uint256) {
        uint256 balance = USDm.balanceOf(address(this));
        if (balance > totalStaked) {
            return balance - totalStaked;
        }
        return 0;
    }

    /**
     * @notice Get check-in status of a user for all days of THEIR challenge
     *         (the duration snapshotted when they started, not the current
     *         global default — those can differ once setParams() has run).
     */
    function getCheckedInDays(address user) external view returns (bool[] memory) {
        uint256 duration = challenges[user].duration > 0 ? challenges[user].duration : challengeDuration;
        bool[] memory result = new bool[](duration);
        for (uint256 i = 0; i < duration; i++) {
            result[i] = checkedInDays[user][i];
        }
        return result;
    }
}
