export const ONCHAIN_JOURNAL_ADDRESS =
  (process.env.NEXT_PUBLIC_ONCHAIN_JOURNAL_ADDRESS ?? '0xabB385E7e9e482f871fCEfb15aEFabc7B3AA63f7') as `0x${string}`;

export const ONCHAIN_JOURNAL_ABI = [
  {
    name: 'saveEncryptedEntry',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ciphertext', type: 'bytes' },
      { name: 'iv', type: 'bytes12' },
    ],
    outputs: [{ name: 'entryId', type: 'uint256' }],
  },
  {
    name: 'getEntry',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'entryId', type: 'uint256' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'owner', type: 'address' },
        { name: 'ciphertext', type: 'bytes' },
        { name: 'iv', type: 'bytes12' },
        { name: 'createdAt', type: 'uint64' },
      ],
    }],
  },
  {
    name: 'getOwnerEntryIds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'EncryptedEntrySaved',
    type: 'event',
    inputs: [
      { name: 'entryId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'ciphertextBytes', type: 'uint256', indexed: false },
      { name: 'createdAt', type: 'uint256', indexed: false },
    ],
  },
] as const;
