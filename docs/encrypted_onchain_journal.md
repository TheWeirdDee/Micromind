# Encrypted on-chain journals

This feature is separate from MicroMind's existing local/Supabase journal flow.
Normal entries continue to sync as client-encrypted Supabase data. A user may
explicitly anchor an additional encrypted copy of an entry on Celo.

## Privacy and access model

- The browser encrypts up to 1,000 UTF-8 bytes with AES-256-GCM.
- The AES key is derived locally from a fixed-message wallet signature. The
  signature and key are never sent to MicroMind, Supabase, or the contract.
- The contract stores the ciphertext and 12-byte IV literally.
- The wallet address, timestamp, ciphertext length, and transaction remain
  public forever.
- Recovery requires the same wallet to sign the same key message. MicroMind
  cannot recover a lost wallet or encryption key.
- Images and audio are not included. Emojis are supported but consume multiple
  UTF-8 bytes.

This first release grants access only to the owner wallet. Sharing an entry with
another wallet requires recipient public-key registration and wrapped per-entry
keys; it must not be implemented by publishing the owner's derived key.

## Deployment

From `contracts/`:

```bash
npx hardhat run scripts/deploy-encrypted-journal.ts --network celo
```

Set the printed address in the web app environment:

```text
NEXT_PUBLIC_ONCHAIN_JOURNAL_ADDRESS=0x...
```

Users pay the live Celo gas fee directly. The contract does not currently
collect a MicroMind application fee.
