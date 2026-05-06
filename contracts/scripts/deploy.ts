import { ethers, network } from "hardhat";

async function main() {
  console.log(`\nDeploying MicroMindPayment to ${network.name}...`);
  console.log("Payment token: Native CELO");
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} CELO`);
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error(
      "Not enough CELO to deploy!\n" +
      "Need at least 0.01 CELO for gas.\n" +
      "Your address: " + deployer.address
    );
  }
  
  const Factory = await ethers.getContractFactory("MicroMindPayment");
  console.log("Deploying...");
  
  const feeData = await ethers.provider.getFeeData();
  console.log(`Base fee: ${feeData.gasPrice?.toString()}`);

  const contract = await Factory.deploy({
    maxFeePerGas: feeData.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
  });
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  const explorerBase = network.name === "celo" 
    ? "https://celoscan.io"
    : "https://celo-sepolia.blockscout.com";
  
  console.log("\n✅ DEPLOYED SUCCESSFULLY!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Contract:  ${address}`);
  console.log(`Network:   ${network.name}`);
  console.log(`Explorer:  ${explorerBase}/address/${address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📋 Copy these to your .env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_IS_TESTNET=false`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=42220`);
  console.log("\n📋 Copy to contracts/.env for verification:");
  console.log(
    `npx hardhat verify --network ${network.name} ${address}`
  );
}

main().catch((e) => {
  console.error("\n❌ Deploy failed:", e.message);
  process.exit(1);
});
