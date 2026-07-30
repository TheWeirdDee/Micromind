import { ethers } from "hardhat";

async function main() {
  const journal = await ethers.deployContract("EncryptedOnchainJournal");
  await journal.waitForDeployment();
  console.log("EncryptedOnchainJournal:", await journal.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
