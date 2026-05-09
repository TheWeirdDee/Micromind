import { ethers, network } from "hardhat";

async function main() {
  // MAINNET ONLY
  const USDC_CELO_MAINNET = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";

  console.log("\nDeploying MicroMindPayment to Celo Mainnet...");
  console.log(`Payment token: USDC (${USDC_CELO_MAINNET})`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`CELO balance: ${ethers.formatEther(balance)} CELO`);

  if (balance < ethers.parseEther("0.01")) {
    throw new Error(
      "Not enough CELO for gas. Need at least 0.01 CELO.\n" +
      "Your address: " + deployer.address
    );
  }

  // Use legacy gasPrice for Celo mainnet compatibility
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? BigInt(5000000000);
  console.log(`Gas price: ${gasPrice.toString()}`);

  const Factory = await ethers.getContractFactory("MicroMindPayment");

  const contract = await Factory.deploy(USDC_CELO_MAINNET, {
    gasPrice: gasPrice,
  });

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n✅ DEPLOYED TO CELO MAINNET!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Contract:  ${address}`);
  console.log(`Token:     USDC`);
  console.log(`Explorer:  https://celoscan.io/address/${address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📋 Add these to .env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${USDC_CELO_MAINNET}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=42220`);
  console.log("\n📋 Add to agent/.env:");
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log("\n📋 Verify contract:");
  console.log(
    `npx hardhat verify --network celo ${address} ${USDC_CELO_MAINNET}`
  );
}

main().catch((e) => {
  console.error("\n❌ Deploy failed:", e.message);
  process.exit(1);
});
