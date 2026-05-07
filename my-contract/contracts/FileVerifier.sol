// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FileVerifier
 * @notice Stores SHA-256 file hashes on Sepolia, anchored to an RPi Ed25519 hardware signature.
 * @dev  Called by the LexNet backend after biometric + RFID verification succeeds on the RPi.
 */
contract FileVerifier {
    struct Record {
        bytes32  fileHash;        // SHA-256 of the document payload
        string   rpiSignature;    // Ed25519 signature from the Raspberry Pi (base64)
        uint256  timestamp;       // block.timestamp at time of commit
        address  verifiedBy;      // backend wallet that submitted the tx
    }

    /// @notice fileHash → on-chain record
    mapping(bytes32 => Record) public records;

    /// @notice Emitted when a new file is verified on-chain
    event FileVerified(
        bytes32 indexed fileHash,
        address indexed verifiedBy,
        uint256 timestamp
    );

    /**
     * @notice Commit a file verification record.
     * @param _fileHash  SHA-256 hash of the document (as bytes32)
     * @param _rpiSig    Base64-encoded Ed25519 signature from the hardware node
     */
    function verifyFile(bytes32 _fileHash, string calldata _rpiSig) external {
        records[_fileHash] = Record(
            _fileHash,
            _rpiSig,
            block.timestamp,
            msg.sender
        );
        emit FileVerified(_fileHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Read back a verification record.
     * @param _fileHash  The hash to look up
     * @return The full Record struct
     */
    function getRecord(bytes32 _fileHash) external view returns (Record memory) {
        return records[_fileHash];
    }
}
