import { ethers } from "hardhat";

async function main() {
  console.log("Script starting...");
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", signer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
