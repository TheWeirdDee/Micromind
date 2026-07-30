import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("EncryptedOnchainJournal", function () {
  async function deploy() {
    const factory = await ethers.getContractFactory("EncryptedOnchainJournal");
    return factory.deploy();
  }

  it("stores ciphertext and indexes it by owner", async function () {
    const [owner] = await ethers.getSigners();
    const journal = await deploy();
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
  });

  it("rejects empty and oversized ciphertext", async function () {
    const journal = await deploy();
    const iv = ethers.hexlify(ethers.randomBytes(12));
    await expect(journal.saveEncryptedEntry("0x", iv))
      .to.be.revertedWithCustomError(journal, "EmptyCiphertext");
    await expect(journal.saveEncryptedEntry(ethers.hexlify(ethers.randomBytes(1017)), iv))
      .to.be.revertedWithCustomError(journal, "CiphertextTooLarge")
      .withArgs(1017, 1016);
  });
});
