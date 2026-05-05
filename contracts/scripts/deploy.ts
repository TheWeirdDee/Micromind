import { ethers, network } from "hardhat";

async function main() {
  const CUSD_MAINNET   = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  const CUSD_ALFAJORES = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
  
  const cUSDAddress = network.name === "celo" 
    ? CUSD_MAINNET 
    : CUSD_ALFAJORES;

  console.log(`Deploying to ${network.name}...`);
  console.log(`Using cUSD: ${cUSDAddress}`);

  const MMP = await ethers.getContractFactory("MicroMindPayment");
  const contract = await MMP.deploy(cUSDAddress);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ MicroMindPayment deployed to: ${address}`);
  console.log(`Add to .env.local: NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main().catch(console.error);
