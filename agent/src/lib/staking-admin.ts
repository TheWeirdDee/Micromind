import { createWalletClient, createPublicClient, http, erc20Abi, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { MICROMIND_STAKING_ABI } from './contract';

const USDM_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as Address;
const RPC_URL = 'https://rpc.ankr.com/celo';

function getClients() {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error('Relayer private key not configured');
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, chain: celo, transport: http(RPC_URL) });
  const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) });
  return { account, walletClient, publicClient };
}

export interface StakingStatus {
  stakeAmount: string;
  challengeDuration: string;
  requiredCheckins: string;
  rewardAmount: string;
  totalStaked: string;
  rewardPoolBalance: string;
  freeRewardPool: string;
  reservedRewards: string;
  relayerPaused: boolean;
  relayerAddress: string;
  relayerCeloBalance: string;
  relayerUsdmBalance: string;
  isOwner: boolean;
}

export async function getStakingStatus(stakingAddress: Address): Promise<StakingStatus> {
  const { account, publicClient } = getClients();

  const [
    stakeAmount, challengeDuration, requiredCheckins, rewardAmount,
    totalStaked, rewardPoolBalance, freeRewardPool, reservedRewards,
    relayerPaused, owner, celoBalance, usdmBalance,
  ] = await Promise.all([
    publicClient.readContract({ address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'stakeAmount' }) as Promise<bigint>,
    publicClient.readContract({ address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'challengeDuration' }) as Promise<bigint>,
    publicClient.readContract({ address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'requiredCheckins' }) as Promise<bigint>,
    publicClient.readContract({ address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'rewardAmount' }) as Promise<bigint>,
    publicClient.readContract({ address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'totalStaked' }) as Promise<bigint>,
    publicClient.readContract({ address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'rewardPoolBalance' }) as Promise<bigint>,
    publicClient.readContract({ address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'freeRewardPool' }) as Promise<bigint>,
    publicClient.readContract({ address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'reservedRewards' }) as Promise<bigint>,
    publicClient.readContract({ address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'relayerPaused' }) as Promise<boolean>,
    publicClient.readContract({ address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'owner' }) as Promise<Address>,
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({ address: USDM_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] }) as Promise<bigint>,
  ]);

  return {
    stakeAmount: stakeAmount.toString(),
    challengeDuration: challengeDuration.toString(),
    requiredCheckins: requiredCheckins.toString(),
    rewardAmount: rewardAmount.toString(),
    totalStaked: totalStaked.toString(),
    rewardPoolBalance: rewardPoolBalance.toString(),
    freeRewardPool: freeRewardPool.toString(),
    reservedRewards: reservedRewards.toString(),
    relayerPaused,
    relayerAddress: account.address,
    relayerCeloBalance: celoBalance.toString(),
    relayerUsdmBalance: usdmBalance.toString(),
    isOwner: owner.toLowerCase() === account.address.toLowerCase(),
  };
}

export async function setRelayerPaused(stakingAddress: Address, paused: boolean): Promise<string> {
  const { account, walletClient, publicClient } = getClients();
  const hash = await walletClient.writeContract({
    address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'setRelayerPaused', args: [paused], account, chain: celo,
  });
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 60_000 });
  return hash;
}

export async function fundRewardPool(stakingAddress: Address, amountWei: bigint): Promise<string> {
  const { account, walletClient, publicClient } = getClients();

  const approveHash = await walletClient.writeContract({
    address: USDM_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [stakingAddress, amountWei], account, chain: celo,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1, timeout: 60_000 });

  const fundHash = await walletClient.writeContract({
    address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'fundRewardPool', args: [amountWei], account, chain: celo,
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash, confirmations: 1, timeout: 60_000 });
  return fundHash;
}

export async function withdrawExcess(stakingAddress: Address, amountWei: bigint): Promise<string> {
  const { account, walletClient, publicClient } = getClients();
  const hash = await walletClient.writeContract({
    address: stakingAddress, abi: MICROMIND_STAKING_ABI, functionName: 'withdrawExcess', args: [amountWei], account, chain: celo,
  });
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 60_000 });
  return hash;
}

export async function setStakingParams(
  stakingAddress: Address,
  params: { stakeAmount: bigint; challengeDuration: bigint; requiredCheckins: bigint; rewardAmount: bigint },
): Promise<string> {
  const { account, walletClient, publicClient } = getClients();
  const hash = await walletClient.writeContract({
    address: stakingAddress,
    abi: MICROMIND_STAKING_ABI,
    functionName: 'setParams',
    args: [params.stakeAmount, params.challengeDuration, params.requiredCheckins, params.rewardAmount],
    account,
    chain: celo,
  });
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 60_000 });
  return hash;
}
