import { privateKeyToAccount } from 'viem/accounts';
const key = process.argv[2] as `0x${string}`;
if (key) {
  const account = privateKeyToAccount(key);
  console.log(`Address: ${account.address}`);
}
