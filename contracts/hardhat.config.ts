import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

task("deploy-micromind", "Deploys the MicroMindPayment contract")
  .addOptionalParam("cusd", "The cUSD contract address")
  .setAction(async (taskArgs, hre) => {
    const CUSD = taskArgs.cusd || (hre.network.name === "celo"
      ? "0x765DE816845861e75A25fCA122bb6898B8B1282a"
      : "0x765DE816845861e75A25fCA122bb6898B8B1282a");
    
    console.log(`Deploying to ${hre.network.name}...`);
    console.log(`Using cUSD: ${CUSD}`);
    
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} CELO`);
    
    if (balance === 0n) {
      console.error("❌ ERROR: Deployer has no CELO. Get testnet tokens at https://faucet.celo.org");
      return;
    }
    
    const Factory = await hre.ethers.getContractFactory("MicroMindPayment");
    const contract = await Factory.deploy(CUSD);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log("\n✅ SUCCESS!");
    console.log(`Contract address: ${address}`);
    console.log(`\nNext steps:`);
    console.log(`1. Add to .env.local: NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
    console.log(`2. Verify: npx hardhat verify --network ${hre.network.name} ${address} ${CUSD}`);
  });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: "https://forno.celo-sepolia.celo-testnet.org",
      chainId: 11142220,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    celo: {
      url: "https://forno.celo.org",
      chainId: 42220,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.CELOSCAN_API_KEY || "",
      celo: process.env.CELOSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "sepolia",
        chainId: 11142220,
        urls: {
          apiURL: "https://api-sepolia.celoscan.io/api",
          browserURL: "https://sepolia.celoscan.io",
        },
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io",
        },
      },
    ],
  },
};

export default config;
