// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MicroMind Encrypted On-chain Journal
/// @notice Stores journal ciphertext literally in Celo contract storage.
/// @dev Encryption and decryption happen in the user's browser. This contract
///      never receives plaintext or an encryption key.
contract EncryptedOnchainJournal {
    uint256 public constant MAX_CIPHERTEXT_BYTES = 1016;

    struct Entry {
        address owner;
        bytes ciphertext;
        bytes12 iv;
        uint64 createdAt;
    }

    uint256 public nextEntryId = 1;
    mapping(uint256 => Entry) private entries;
    mapping(address => uint256[]) private ownerEntryIds;

    event EncryptedEntrySaved(
        uint256 indexed entryId,
        address indexed owner,
        uint256 ciphertextBytes,
        uint256 createdAt
    );

    error EmptyCiphertext();
    error CiphertextTooLarge(uint256 supplied, uint256 maximum);
    error EntryDoesNotExist(uint256 entryId);

    function saveEncryptedEntry(
        bytes calldata ciphertext,
        bytes12 iv
    ) external returns (uint256 entryId) {
        if (ciphertext.length == 0) revert EmptyCiphertext();
        if (ciphertext.length > MAX_CIPHERTEXT_BYTES) {
            revert CiphertextTooLarge(ciphertext.length, MAX_CIPHERTEXT_BYTES);
        }

        entryId = nextEntryId++;
        entries[entryId] = Entry({
            owner: msg.sender,
            ciphertext: ciphertext,
            iv: iv,
            createdAt: uint64(block.timestamp)
        });
        ownerEntryIds[msg.sender].push(entryId);

        emit EncryptedEntrySaved(
            entryId,
            msg.sender,
            ciphertext.length,
            block.timestamp
        );
    }

    function getEntry(uint256 entryId) external view returns (Entry memory) {
        Entry memory entry = entries[entryId];
        if (entry.owner == address(0)) revert EntryDoesNotExist(entryId);
        return entry;
    }

    function getOwnerEntryIds(address owner) external view returns (uint256[] memory) {
        return ownerEntryIds[owner];
    }
}
