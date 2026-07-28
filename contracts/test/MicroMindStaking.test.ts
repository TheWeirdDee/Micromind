import { expect } from "chai";
import { ethers } from "hardhat";
import { MockERC20, MicroMindStaking } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("MicroMindStaking", function () {
  let usdm: MockERC20;
  let staking: MicroMindStaking;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let otherUser: SignerWithAddress;

  const STAKE_AMOUNT = ethers.parseUnits("5", 18);
  const REWARD_AMOUNT = ethers.parseUnits("0.5", 18);

  beforeEach(async function () {
    [owner, user, , otherUser] = await ethers.getSigners();

    // Deploy Mock USDm
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    usdm = (await MockERC20Factory.deploy()) as unknown as MockERC20;
    await usdm.waitForDeployment();

    // Deploy MicroMindStaking
    const MicroMindStakingFactory = await ethers.getContractFactory("MicroMindStaking");
    staking = (await MicroMindStakingFactory.deploy(await usdm.getAddress())) as unknown as MicroMindStaking;
    await staking.waitForDeployment();

    // Transfer relayer rights to the relayer wallet by using setParams or standard Ownable transferOwnership
    // We will keep owner as relayer for simple relayer tests, but let's test owner restrictions too
    
    // Mint USDm to user and otherUser
    await usdm.transfer(user.address, ethers.parseUnits("100", 18));
    await usdm.transfer(otherUser.address, ethers.parseUnits("100", 18));

    // Fund Reward Pool
    await usdm.approve(await staking.getAddress(), ethers.parseUnits("10", 18));
    await staking.fundRewardPool(ethers.parseUnits("10", 18));
  });

  describe("Constructor & Initialization", function () {
    it("Should set correct defaults", async function () {
      expect(await staking.USDm()).to.equal(await usdm.getAddress());
      expect(await staking.stakeAmount()).to.equal(STAKE_AMOUNT);
      expect(await staking.challengeDuration()).to.equal(30n);
      expect(await staking.requiredCheckins()).to.equal(25n);
      expect(await staking.rewardAmount()).to.equal(REWARD_AMOUNT);
      expect(await staking.rewardPoolBalance()).to.equal(ethers.parseUnits("10", 18));
    });
  });

  describe("Start Challenge", function () {
    it("Should allow a user to start a challenge directly", async function () {
      const balanceBefore = await usdm.balanceOf(user.address);
      await usdm.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);

      await expect(staking.connect(user).startChallenge())
        .to.emit(staking, "ChallengeStarted")
        .withArgs(user.address, anyTimestamp(), STAKE_AMOUNT);

      const challenge = await staking.challenges(user.address);
      expect(challenge.active).to.equal(true);
      expect(challenge.claimed).to.equal(false);
      expect(challenge.checkInCount).to.equal(0);
      expect(challenge.startTime).to.be.greaterThan(0n);

      expect(await usdm.balanceOf(user.address)).to.equal(balanceBefore - STAKE_AMOUNT);
      expect(await staking.totalStaked()).to.equal(STAKE_AMOUNT);
      expect(await staking.rewardPoolBalance()).to.equal(ethers.parseUnits("10", 18)); // reward pool shouldn't change
    });

    it("Should allow relayer (owner) to start challenge for a user", async function () {
      await usdm.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);

      await expect(staking.connect(owner).startChallengeFor(user.address))
        .to.emit(staking, "ChallengeStarted")
        .withArgs(user.address, anyTimestamp(), STAKE_AMOUNT);
    });

    it("Should fail if other than owner starts for a user", async function () {
      await usdm.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
      await expect(staking.connect(otherUser).startChallengeFor(user.address))
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });

    it("Should fail if user already has active challenge", async function () {
      await usdm.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT * 2n);
      await staking.connect(user).startChallenge();

      await expect(staking.connect(user).startChallenge())
        .to.be.revertedWithCustomError(staking, "ChallengeAlreadyActive");
    });
  });

  describe("Check In", function () {
    const entryHash = ethers.keccak256(ethers.toUtf8Bytes("Day 1 journaling"));

    beforeEach(async function () {
      await usdm.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user).startChallenge();
    });

    it("Should allow check-in on Day 0", async function () {
      await expect(staking.connect(user).checkIn(entryHash))
        .to.emit(staking, "CheckedIn")
        .withArgs(user.address, 0n, entryHash, anyTimestamp());

      const challenge = await staking.challenges(user.address);
      expect(challenge.checkInCount).to.equal(1);
    });

    it("Should allow relayer to check-in for user", async function () {
      await expect(staking.connect(owner).checkInFor(user.address, entryHash))
        .to.emit(staking, "CheckedIn")
        .withArgs(user.address, 0n, entryHash, anyTimestamp());
    });

    it("Should fail duplicate check-in on the same day", async function () {
      await staking.connect(user).checkIn(entryHash);
      await expect(staking.connect(user).checkIn(entryHash))
        .to.be.revertedWithCustomError(staking, "AlreadyCheckedInToday");
    });

    it("Should allow check-ins on subsequent days", async function () {
      await staking.connect(user).checkIn(entryHash);

      // Increase time by 1 day
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      const entryHash2 = ethers.keccak256(ethers.toUtf8Bytes("Day 2 journaling"));
      await expect(staking.connect(user).checkIn(entryHash2))
        .to.emit(staking, "CheckedIn")
        .withArgs(user.address, 1n, entryHash2, anyTimestamp());

      const challenge = await staking.challenges(user.address);
      expect(challenge.checkInCount).to.equal(2);
    });

    it("Should reject a zero entryHash as a no-op check-in", async function () {
      await expect(staking.connect(user).checkIn(ethers.ZeroHash))
        .to.be.revertedWithCustomError(staking, "EmptyEntryHash");
    });

    it("Should fail checking in after challenge duration ended", async function () {
      // Increase time by 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 86400]);
      await ethers.provider.send("evm_mine", []);

      await expect(staking.connect(user).checkIn(entryHash))
        .to.be.revertedWithCustomError(staking, "DayIndexOutOfBounds");
    });
  });

  describe("Withdrawal & Rewards", function () {
    const entryHash = ethers.keccak256(ethers.toUtf8Bytes("journal entry"));

    beforeEach(async function () {
      await usdm.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user).startChallenge();
    });

    it("Should prevent premature withdrawal", async function () {
      await expect(staking.connect(user).withdraw())
        .to.be.revertedWithCustomError(staking, "ChallengeNotEnded");
    });

    it("Should return only principal for non-finisher (less than required checkins)", async function () {
      // Check in 5 times (required is 25)
      for (let i = 0; i < 5; i++) {
        await staking.connect(user).checkIn(entryHash);
        await ethers.provider.send("evm_increaseTime", [86400]);
        await ethers.provider.send("evm_mine", []);
      }

      // Fast forward remaining of 30 days
      await ethers.provider.send("evm_increaseTime", [25 * 86400]);
      await ethers.provider.send("evm_mine", []);

      const balanceBefore = await usdm.balanceOf(user.address);

      await expect(staking.connect(user).withdraw())
        .to.emit(staking, "ChallengeEnded")
        .withArgs(user.address, 5, false, STAKE_AMOUNT, anyTimestamp());

      expect(await usdm.balanceOf(user.address)).to.equal(balanceBefore + STAKE_AMOUNT);
      const challenge = await staking.challenges(user.address);
      expect(challenge.active).to.equal(false);
      expect(challenge.claimed).to.equal(true);
    });

    it("Should return principal + reward for finisher", async function () {
      // Check in 26 times (required is 25)
      for (let i = 0; i < 26; i++) {
        await staking.connect(user).checkIn(entryHash);
        await ethers.provider.send("evm_increaseTime", [86400]);
        await ethers.provider.send("evm_mine", []);
      }

      // Fast forward remaining of 30 days
      await ethers.provider.send("evm_increaseTime", [4 * 86400]);
      await ethers.provider.send("evm_mine", []);

      const balanceBefore = await usdm.balanceOf(user.address);

      await expect(staking.connect(user).withdraw())
        .to.emit(staking, "ChallengeEnded")
        .withArgs(user.address, 26, true, STAKE_AMOUNT + REWARD_AMOUNT, anyTimestamp());

      expect(await usdm.balanceOf(user.address)).to.equal(balanceBefore + STAKE_AMOUNT + REWARD_AMOUNT);
    });

    it("Should reserve the reward at start time so a later pool drain cannot claw it back from an in-progress finisher", async function () {
      // `user` already started in the outer beforeEach — 0.5 USDm should now
      // be carved out of the 10 USDm pool and guaranteed to them.
      expect(await staking.reservedRewards()).to.equal(REWARD_AMOUNT);
      expect(await staking.freeRewardPool()).to.equal(ethers.parseUnits("9.5", 18));

      // Owner sweeps every bit of the pool that ISN'T reserved for `user`.
      const free = await staking.freeRewardPool();
      await staking.connect(owner).withdrawExcess(free);
      expect(await staking.freeRewardPool()).to.equal(0n);
      // The reserved 0.5 is untouchable even though it's still sitting in the contract.
      await expect(staking.connect(owner).withdrawExcess(1n))
        .to.be.revertedWith("Cannot withdraw active stakes");

      // User checks in 26 times and finishes out the 30-day term.
      for (let i = 0; i < 26; i++) {
        await staking.connect(user).checkIn(entryHash);
        await ethers.provider.send("evm_increaseTime", [86400]);
        await ethers.provider.send("evm_mine", []);
      }
      await ethers.provider.send("evm_increaseTime", [4 * 86400]);
      await ethers.provider.send("evm_mine", []);

      const balanceBefore = await usdm.balanceOf(user.address);

      // Finisher gets the FULL reserved reward, unaffected by the pool having
      // been drained down to exactly the reserved amount in between.
      await expect(staking.connect(user).withdraw())
        .to.emit(staking, "ChallengeEnded")
        .withArgs(user.address, 26, true, STAKE_AMOUNT + REWARD_AMOUNT, anyTimestamp());

      expect(await usdm.balanceOf(user.address)).to.equal(balanceBefore + STAKE_AMOUNT + REWARD_AMOUNT);
      expect(await staking.reservedRewards()).to.equal(0n);
    });

    it("Should reserve only what's free at start time when the pool is already short of the nominal reward", async function () {
      // Drain the FREE pool down to 0.2 USDm — less than the 0.5 USDm nominal
      // reward (the outer beforeEach already reserved 0.5 for `user`'s challenge).
      const free = await staking.freeRewardPool();
      await staking.connect(owner).withdrawExcess(free - ethers.parseUnits("0.2", 18));
      expect(await staking.freeRewardPool()).to.equal(ethers.parseUnits("0.2", 18));

      // A different user starts fresh — should only reserve the 0.2 that's actually available.
      await usdm.connect(otherUser).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(otherUser).startChallenge();
      expect((await staking.challenges(otherUser.address)).rewardReserved).to.equal(ethers.parseUnits("0.2", 18));
      expect(await staking.freeRewardPool()).to.equal(0n);

      for (let i = 0; i < 26; i++) {
        await staking.connect(otherUser).checkIn(ethers.keccak256(ethers.toUtf8Bytes(`e-${i}`)));
        await ethers.provider.send("evm_increaseTime", [86400]);
        await ethers.provider.send("evm_mine", []);
      }
      await ethers.provider.send("evm_increaseTime", [4 * 86400]);
      await ethers.provider.send("evm_mine", []);

      const balanceBefore = await usdm.balanceOf(otherUser.address);
      await expect(staking.connect(otherUser).withdraw())
        .to.emit(staking, "ChallengeEnded")
        .withArgs(otherUser.address, 26, true, STAKE_AMOUNT + ethers.parseUnits("0.2", 18), anyTimestamp());

      expect(await usdm.balanceOf(otherUser.address)).to.equal(balanceBefore + STAKE_AMOUNT + ethers.parseUnits("0.2", 18));
    });
  });

  describe("Owner & Management Controls", function () {
    it("Should allow owner to withdraw excess rewards but not active stakes or reserved rewards", async function () {
      await usdm.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user).startChallenge();

      // Starting the challenge reserved 0.5 USDm out of the 10 USDm pool.
      const freePool = await staking.freeRewardPool();
      expect(freePool).to.equal(ethers.parseUnits("9.5", 18));

      // Attempt to withdraw more than what's free (should revert)
      await expect(staking.connect(owner).withdrawExcess(freePool + 1n))
        .to.be.revertedWith("Cannot withdraw active stakes");

      // Withdraw exactly the free amount
      const balanceBefore = await usdm.balanceOf(owner.address);
      await staking.connect(owner).withdrawExcess(freePool);
      expect(await usdm.balanceOf(owner.address)).to.equal(balanceBefore + freePool);
      expect(await staking.freeRewardPool()).to.equal(0n);
      expect(await staking.rewardPoolBalance()).to.equal(REWARD_AMOUNT); // reserved reward still sitting there
      expect(await staking.totalStaked()).to.equal(STAKE_AMOUNT); // stake remains safe
    });

    it("Should allow owner to update parameters", async function () {
      const newStake = ethers.parseUnits("10", 18);
      const newDuration = 15n;
      const newRequired = 10n;
      const newReward = ethers.parseUnits("1", 18);

      await expect(staking.connect(owner).setParams(newStake, newDuration, newRequired, newReward))
        .to.emit(staking, "ParamsUpdated")
        .withArgs(newStake, newDuration, newRequired, newReward);

      expect(await staking.stakeAmount()).to.equal(newStake);
      expect(await staking.challengeDuration()).to.equal(newDuration);
      expect(await staking.requiredCheckins()).to.equal(newRequired);
      expect(await staking.rewardAmount()).to.equal(newReward);
    });

    it("Should prevent non-owners from updating parameters or withdrawing excess", async function () {
      await expect(staking.connect(user).setParams(STAKE_AMOUNT, 30n, 25n, REWARD_AMOUNT))
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");

      await expect(staking.connect(user).withdrawExcess(100n))
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });

    it("Should reject setParams values that would brick future challenges", async function () {
      await expect(staking.connect(owner).setParams(0n, 30n, 25n, REWARD_AMOUNT))
        .to.be.revertedWithCustomError(staking, "InvalidParams"); // zero stake
      await expect(staking.connect(owner).setParams(STAKE_AMOUNT, 0n, 25n, REWARD_AMOUNT))
        .to.be.revertedWithCustomError(staking, "InvalidParams"); // zero duration
      await expect(staking.connect(owner).setParams(STAKE_AMOUNT, 10n, 11n, REWARD_AMOUNT))
        .to.be.revertedWithCustomError(staking, "InvalidParams"); // requiredCheckins > duration
    });

    it("Should let the owner pause/unpause only the relayer entrypoints", async function () {
      await staking.connect(owner).setRelayerPaused(true);

      await usdm.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
      // Relayer-only entrypoints are blocked while paused...
      await expect(staking.connect(owner).startChallengeFor(user.address))
        .to.be.revertedWithCustomError(staking, "RelayerPaused");

      // ...but a user's own direct call still works.
      await staking.connect(user).startChallenge();
      const entryHash = ethers.keccak256(ethers.toUtf8Bytes("entry"));
      await expect(staking.connect(owner).checkInFor(user.address, entryHash))
        .to.be.revertedWithCustomError(staking, "RelayerPaused");
      await staking.connect(user).checkIn(entryHash); // direct check-in unaffected

      // Withdrawals — including relayer-triggered ones — are never blocked by the pause,
      // since a payout always goes to the challenge's own owner regardless of caller.
      await ethers.provider.send("evm_increaseTime", [30 * 86400]);
      await ethers.provider.send("evm_mine", []);
      await expect(staking.connect(owner).withdrawFor(user.address)).to.not.be.reverted;

      await staking.connect(owner).setRelayerPaused(false);
      await usdm.connect(otherUser).approve(await staking.getAddress(), STAKE_AMOUNT);
      await expect(staking.connect(owner).startChallengeFor(otherUser.address)).to.not.be.reverted;
    });

    it("Should NOT retroactively apply setParams to an already-active challenge", async function () {
      // User starts under the original terms: 5 USDm stake, 30-day duration, 25 required check-ins.
      await usdm.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user).startChallenge();

      // Owner drastically changes the terms mid-challenge — this must not affect `user`.
      // (duration/requiredCheckins must stay within setParams' own bounds checks —
      // see the "Should bounds-check setParams" tests for the zero-duration case.)
      await staking.connect(owner).setParams(
        ethers.parseUnits("10", 18), // new stake — double the original
        1n,                          // new duration — would let anyone withdraw almost instantly
        0n,                          // new required check-ins — would count as "completed" with zero
        0n                           // new reward — would zero out any reward
      );

      // The drastically shortened 1-day duration would satisfy withdraw's time check
      // almost immediately under the OLD (buggy) logic. Confirm it still respects the
      // user's original 30-day term.
      await expect(staking.connect(user).withdraw()).to.be.revertedWithCustomError(staking, "ChallengeNotEnded");

      // Complete 25 check-ins under the ORIGINAL snapshotted duration/requirement.
      const entryHash = ethers.keccak256(ethers.toUtf8Bytes("entry"));
      await staking.connect(user).checkIn(entryHash);
      for (let i = 0; i < 24; i++) {
        await ethers.provider.send("evm_increaseTime", [86400]);
        await staking.connect(user).checkIn(ethers.keccak256(ethers.toUtf8Bytes(`entry-${i}`)));
      }
      await ethers.provider.send("evm_increaseTime", [6 * 86400]); // finish out the original 30-day term

      const balanceBefore = await usdm.balanceOf(user.address);
      await expect(staking.connect(user).withdraw())
        .to.emit(staking, "ChallengeEnded")
        .withArgs(user.address, 25, true, STAKE_AMOUNT + REWARD_AMOUNT, anyTimestamp());

      // Payout matches the ORIGINAL 5 USDm stake + 0.5 USDm reward, not the new (10 USDm stake, 0 reward) terms.
      expect(await usdm.balanceOf(user.address)).to.equal(balanceBefore + STAKE_AMOUNT + REWARD_AMOUNT);
    });
  });
});

// Helper matcher for timestamps
function anyTimestamp() {
  return (val: unknown) => typeof val === "bigint" && val > 0n;
}
