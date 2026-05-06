console.log("🔥 DEPLOY SCRIPT STARTED");
import { ethers, network } from "hardhat";
import * as fs from "fs";

async function main() {
  const CUSD = network.name === "celo"
    ? "0x765DE816845861e75A25fCA122bb6898B8B1282a"
    : "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  
  console.log(`Deploying to ${network.name}...`);
  console.log(`Using cUSD: ${CUSD}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} CELO`);
  
  if (balance === 0n) {
    throw new Error(
      "Deployer has no CELO. Get testnet tokens at " +
      "https://faucet.celo.org"
    );
  }
  
  const Factory = await ethers.getContractFactory("MicroMindPayment");
  const contract = await Factory.deploy(CUSD);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log("\n✅ SUCCESS!");
  console.log(`Contract address: ${address}`);

  // Fallback: Write to file in case console is suppressed
  fs.writeFileSync("deploy-info.json", JSON.stringify({
    address,
    network: network.name,
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log(`\nNext steps:`);
  console.log(`1. Add to .env.local:`);
  console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log(`\n2. Verify on Celoscan:`);
  console.log(
    `   npx hardhat verify --network ${network.name} ${address} ${CUSD}`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
