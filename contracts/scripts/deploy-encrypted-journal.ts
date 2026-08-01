import { ethers } from "hardhat";

const USDM_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

async function main() {
  const journal = await ethers.deployContract("EncryptedOnchainJournal", [USDM_ADDRESS]);
  await journal.waitForDeployment();
  console.log("EncryptedOnchainJournal:", await journal.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
