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

    /// @notice Total USDm currently earmarked as guaranteed rewards for active
    ///         challenges (see `rewardReserved` below) — excluded from what
    ///         `withdrawExcess` can sweep and from what a later challenge can reserve.
    uint256 public reservedRewards;

    /// @notice Emergency circuit breaker scoped to the two relayer entrypoints
    ///         that create new obligations on a user's behalf without their
    ///         own signed transaction (startChallengeFor, checkInFor). If the
    ///         relayer's private key is ever suspected compromised, the owner
    ///         can flip this to stop new relayed stakes/check-ins while still
    ///         letting every user withdraw (directly or via withdrawFor) —
    ///         withdrawals only ever pay the challenge's own owner, so they
    ///         can't be abused even by a compromised relayer key.
    bool public relayerPaused;

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
        // The reward actually carved out of the free pool at start time — this,
        // not rewardAmountSnapshot, is what gets paid on a completed withdrawal.
        // Reserving it up front means a finisher's payout can never be reduced
        // by other users finishing first and draining a shared pool later on.
        uint256 rewardReserved;
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
    event RelayerPausedSet(bool paused);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error ChallengeAlreadyActive();
    error NoActiveChallenge();
    error ChallengeNotEnded();
    error AlreadyCheckedInToday();
    error DayIndexOutOfBounds();
    error TransferFailed();
    error EmptyEntryHash();
    error InvalidParams();
    error RelayerPaused();

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
     * @dev The hash is never compared against real content — it is a client-side
     *      commitment only (currently Keccak256 of the entry text, see the frontend
     *      hashing code), not an on-chain proof that any journaling occurred. It must
     *      be non-zero so a bare/placeholder value can't be used as a no-op check-in.
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
        if (relayerPaused) revert RelayerPaused();
        _startChallenge(user);
    }

    /**
     * @notice Check in on behalf of a user. Called by the relayer after verifying signature.
     */
    function checkInFor(address user, bytes32 entryHash) external onlyOwner {
        if (relayerPaused) revert RelayerPaused();
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

        // Carve the reward out of the free pool NOW, not at withdrawal time.
        // This guarantees whatever gets reserved here regardless of how many
        // other users finish (and draw down the pool) before this user withdraws.
        uint256 free = freeRewardPool();
        uint256 reserve = snapshotReward <= free ? snapshotReward : free;
        reservedRewards += reserve;

        challenges[user] = Challenge({
            startTime: block.timestamp,
            checkInCount: 0,
            active: true,
            claimed: false,
            stakedAmount: snapshotStake,
            duration: snapshotDuration,
            requiredCheckinsSnapshot: snapshotRequiredCheckins,
            rewardAmountSnapshot: snapshotReward,
            rewardReserved: reserve
        });

        // Reset check-in records for this challenge's snapshotted duration in case of re-entry
        for (uint256 i = 0; i < snapshotDuration; i++) {
            checkedInDays[user][i] = false;
        }

        emit ChallengeStarted(user, block.timestamp, snapshotStake);
    }

    function _checkIn(address user, bytes32 entryHash) internal {
        if (entryHash == bytes32(0)) revert EmptyEntryHash();

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

        // The reward was already carved out of the pool at start time (see
        // _startChallenge), so it's guaranteed here regardless of what has
        // happened to the shared pool since — no re-checking pool balance.
        if (completed) {
            payout += c.rewardReserved;
        }
        reservedRewards -= c.rewardReserved;

        totalStaked -= c.stakedAmount;

        bool ok = USDm.transfer(user, payout);
        if (!ok) revert TransferFailed();

        emit ChallengeEnded(user, c.checkInCount, completed, payout, block.timestamp);
    }

    // ─── Owner functions ──────────────────────────────────────────────────────

    /**
     * @notice Emergency circuit breaker for the relayer entrypoints only — does
     *         not affect direct user calls or any withdrawal path.
     */
    function setRelayerPaused(bool _paused) external onlyOwner {
        relayerPaused = _paused;
        emit RelayerPausedSet(_paused);
    }

    /**
     * @notice Fund the reward pool with USDm.
     */
    function fundRewardPool(uint256 amount) external {
        bool ok = USDm.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();
        emit RewardPoolFunded(msg.sender, amount);
    }

    /**
     * @notice Update challenge parameters. Only affects challenges started
     *         AFTER this call (see the snapshotting in _startChallenge).
     */
    function setParams(
        uint256 _stakeAmount,
        uint256 _challengeDuration,
        uint256 _requiredCheckins,
        uint256 _rewardAmount
    ) external onlyOwner {
        // Bounds-check so a fat-fingered call can't brick future challenges:
        // a zero stake/duration or a required-checkins count that exceeds the
        // duration would make every future startChallenge/checkIn/withdraw
        // either pointless or permanently unwinnable. Existing in-flight
        // challenges are unaffected either way (their terms are snapshotted).
        if (_stakeAmount == 0 || _challengeDuration == 0 || _requiredCheckins > _challengeDuration) {
            revert InvalidParams();
        }

        stakeAmount = _stakeAmount;
        challengeDuration = _challengeDuration;
        requiredCheckins = _requiredCheckins;
        rewardAmount = _rewardAmount;

        emit ParamsUpdated(_stakeAmount, _challengeDuration, _requiredCheckins, _rewardAmount);
    }

    /**
     * @notice Withdraw excess USDm (unreserved reward pool funds) to owner.
     *         Cannot touch locked stakes or rewards already reserved for an
     *         active challenge's eventual payout.
     */
    function withdrawExcess(uint256 amount) external onlyOwner {
        uint256 free = freeRewardPool();
        require(amount <= free, "Cannot withdraw active stakes");
        bool ok = USDm.transfer(owner(), amount);
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner(), amount);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Get total reward pool balance (contract balance minus locked stakes).
     *         Includes amounts already reserved for active challenges — see
     *         `freeRewardPool()` for what's actually available to reserve/withdraw.
     */
    function rewardPoolBalance() public view returns (uint256) {
        uint256 balance = USDm.balanceOf(address(this));
        if (balance > totalStaked) {
            return balance - totalStaked;
        }
        return 0;
    }

    /**
     * @notice Get the unreserved reward pool balance — what a new challenge
     *         could still reserve, and what withdrawExcess can sweep.
     */
    function freeRewardPool() public view returns (uint256) {
        uint256 pool = rewardPoolBalance();
        if (pool > reservedRewards) {
            return pool - reservedRewards;
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
