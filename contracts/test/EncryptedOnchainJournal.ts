import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("EncryptedOnchainJournal", function () {
  async function deploy() {
    const tokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await tokenFactory.deploy();
    const factory = await ethers.getContractFactory("EncryptedOnchainJournal");
    const journal = await factory.deploy(await token.getAddress());
    return { journal, token };
  }

  it("collects 0.01 USDm, stores ciphertext, and indexes it by owner", async function () {
    const [owner] = await ethers.getSigners();
    const { journal, token } = await deploy();
    const fee = await journal.APP_FEE();
    await token.approve(await journal.getAddress(), fee);
    const ciphertext = ethers.hexlify(ethers.randomBytes(1016));
    const iv = ethers.hexlify(ethers.randomBytes(12));

    await expect(journal.saveEncryptedEntry(ciphertext, iv))
      .to.emit(journal, "EncryptedEntrySaved")
      .withArgs(1, owner.address, 1016, anyValue);

    const entry = await journal.getEntry(1);
    expect(entry.owner).to.equal(owner.address);
    expect(entry.ciphertext).to.equal(ciphertext);
    expect(entry.iv).to.equal(iv);
    expect(await journal.getOwnerEntryIds(owner.address)).to.deep.equal([1n]);
    expect(await token.balanceOf(await journal.getAddress())).to.equal(fee);
  });

  it("allows only the owner to withdraw collected fees", async function () {
    const [owner, other] = await ethers.getSigners();
    const { journal, token } = await deploy();
    const fee = await journal.APP_FEE();
    await token.approve(await journal.getAddress(), fee);
    await journal.saveEncryptedEntry("0x12", ethers.hexlify(ethers.randomBytes(12)));
    await expect(journal.connect(other).withdrawFees(other.address))
      .to.be.revertedWithCustomError(journal, "OwnableUnauthorizedAccount");
    await journal.withdrawFees(owner.address);
    expect(await token.balanceOf(await journal.getAddress())).to.equal(0);
  });

  it("rejects a save when USDm allowance is missing", async function () {
    const { journal } = await deploy();
    await expect(journal.saveEncryptedEntry("0x12", ethers.hexlify(ethers.randomBytes(12))))
      .to.be.reverted;
  });

  it("rejects empty and oversized ciphertext before charging", async function () {
    const { journal } = await deploy();
    const iv = ethers.hexlify(ethers.randomBytes(12));
    await expect(journal.saveEncryptedEntry("0x", iv))
      .to.be.revertedWithCustomError(journal, "EmptyCiphertext");
    await expect(journal.saveEncryptedEntry(ethers.hexlify(ethers.randomBytes(1017)), iv))
      .to.be.revertedWithCustomError(journal, "CiphertextTooLarge")
      .withArgs(1017, 1016);
  });
});
