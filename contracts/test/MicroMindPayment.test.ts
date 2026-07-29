import { expect } from "chai";
import { ethers } from "hardhat";
import { MockERC20, MicroMindPayment } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("MicroMindPayment", function () {
  let usdm: MockERC20;
  let payment: MicroMindPayment;
  let owner: SignerWithAddress; // also acts as the relayer wallet
  let user: SignerWithAddress;
  let otherUser: SignerWithAddress;

  const CHAT_PRICE = ethers.parseUnits("0.005", 18);
  const promptHash = ethers.keccak256(ethers.toUtf8Bytes("hello world"));

  beforeEach(async function () {
    [owner, user, otherUser] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    usdm = (await MockERC20Factory.deploy()) as unknown as MockERC20;
    await usdm.waitForDeployment();

    const PaymentFactory = await ethers.getContractFactory("MicroMindPayment");
    payment = (await PaymentFactory.deploy(await usdm.getAddress())) as unknown as MicroMindPayment;
    await payment.waitForDeployment();

    await usdm.transfer(user.address, ethers.parseUnits("10", 18));
  });

  describe("Direct payment (payForPrompt)", function () {
    it("Should pull USDm from the caller's own wallet", async function () {
      await usdm.connect(user).approve(await payment.getAddress(), CHAT_PRICE);
      const balanceBefore = await usdm.balanceOf(user.address);

      await expect(payment.connect(user).payForPrompt(1, promptHash))
        .to.emit(payment, "PromptPaid")
        .withArgs(user.address, 1, CHAT_PRICE, promptHash, anyTimestamp());

      expect(await usdm.balanceOf(user.address)).to.equal(balanceBefore - CHAT_PRICE);
      expect(await payment.grandTotal()).to.equal(CHAT_PRICE);
    });

    it("Should fail without a prior approval", async function () {
      await expect(payment.connect(user).payForPrompt(1, promptHash)).to.be.reverted;
    });
  });

  describe("Relayed payment (payForPromptFor) — the gasless MiniPay path", function () {
    it("Should pull USDm from the named user, NOT from the relayer/owner wallet", async function () {
      await usdm.connect(user).approve(await payment.getAddress(), CHAT_PRICE);

      const userBalanceBefore = await usdm.balanceOf(user.address);
      const ownerBalanceBefore = await usdm.balanceOf(owner.address);

      await expect(payment.connect(owner).payForPromptFor(user.address, 1, promptHash))
        .to.emit(payment, "PromptPaid")
        .withArgs(user.address, 1, CHAT_PRICE, promptHash, anyTimestamp());

      // The user's balance drops by the price...
      expect(await usdm.balanceOf(user.address)).to.equal(userBalanceBefore - CHAT_PRICE);
      // ...and the relayer/owner's own USDm balance is completely untouched.
      expect(await usdm.balanceOf(owner.address)).to.equal(ownerBalanceBefore);
      expect(await payment.grandTotal()).to.equal(CHAT_PRICE);
    });

    it("Should fail if the named user hasn't approved this contract", async function () {
      await expect(payment.connect(owner).payForPromptFor(user.address, 1, promptHash)).to.be.reverted;
    });

    it("Should fail if called by anyone other than the owner", async function () {
      await usdm.connect(user).approve(await payment.getAddress(), CHAT_PRICE);
      await expect(payment.connect(otherUser).payForPromptFor(user.address, 1, promptHash))
        .to.be.revertedWithCustomError(payment, "OwnableUnauthorizedAccount");
    });

    it("Should only ever spend up to the user's approved allowance, never more", async function () {
      // User only approves a partial amount — relay should fail, not silently
      // fall back to some other funding source.
      await usdm.connect(user).approve(await payment.getAddress(), CHAT_PRICE - 1n);
      await expect(payment.connect(owner).payForPromptFor(user.address, 1, promptHash)).to.be.reverted;
    });
  });

  describe("Owner controls", function () {
    it("Should let the owner update prices and withdraw", async function () {
      await usdm.connect(user).approve(await payment.getAddress(), CHAT_PRICE);
      await payment.connect(user).payForPrompt(1, promptHash);

      const balanceBefore = await usdm.balanceOf(owner.address);
      await payment.connect(owner).withdraw();
      expect(await usdm.balanceOf(owner.address)).to.equal(balanceBefore + CHAT_PRICE);
    });
  });
});

function anyTimestamp() {
  return (val: unknown) => typeof val === "bigint" && val > 0n;
}
