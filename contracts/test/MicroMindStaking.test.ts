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

    it("Should cap reward to available pool balance to prevent locking principal", async function () {
      // Owner withdraws reward pool excess so pool becomes empty
      const currentPool = await staking.rewardPoolBalance();
      await staking.connect(owner).withdrawExcess(currentPool);
      expect(await staking.rewardPoolBalance()).to.equal(0n);

      // User checks in 26 times
      for (let i = 0; i < 26; i++) {
        await staking.connect(user).checkIn(entryHash);
        await ethers.provider.send("evm_increaseTime", [86400]);
        await ethers.provider.send("evm_mine", []);
      }

      // Fast forward remaining of 30 days
      await ethers.provider.send("evm_increaseTime", [4 * 86400]);
      await ethers.provider.send("evm_mine", []);

      const balanceBefore = await usdm.balanceOf(user.address);

      // Finisher should withdraw successfully but with 0 reward (since pool is 0)
      await expect(staking.connect(user).withdraw())
        .to.emit(staking, "ChallengeEnded")
        .withArgs(user.address, 26, true, STAKE_AMOUNT, anyTimestamp()); // only STAKE_AMOUNT returned, no revert

      expect(await usdm.balanceOf(user.address)).to.equal(balanceBefore + STAKE_AMOUNT);
    });
  });

  describe("Owner & Management Controls", function () {
    it("Should allow owner to withdraw excess rewards but not active stakes", async function () {
      await usdm.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user).startChallenge();

      const initialPool = await staking.rewardPoolBalance();
      
      // Attempt to withdraw more than pool (should revert)
      await expect(staking.connect(owner).withdrawExcess(initialPool + 1n))
        .to.be.revertedWith("Cannot withdraw active stakes");

      // Withdraw exactly initialPool
      const balanceBefore = await usdm.balanceOf(owner.address);
      await staking.connect(owner).withdrawExcess(initialPool);
      expect(await usdm.balanceOf(owner.address)).to.equal(balanceBefore + initialPool);
      expect(await staking.rewardPoolBalance()).to.equal(0n);
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
      await expect(staking.connect(user).setParams(0n, 0n, 0n, 0n))
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");

      await expect(staking.connect(user).withdrawExcess(100n))
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });
  });
});

// Helper matcher for timestamps
function anyTimestamp() {
  return (val: unknown) => typeof val === "bigint" && val > 0n;
}
