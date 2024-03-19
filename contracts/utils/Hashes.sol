// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title Hashes
 * @notice A contract that stores used hashes to prevent double spending
 */
abstract contract Hashes {
    mapping(bytes32 => bool) public usedHashes; // keccak256(txHash . txNonce) => is used

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;

    /**
     * @notice Check if the hash is used
     * @param txHash_ The transaction hash from the other chain
     * @param txNonce_ The nonce of the transaction from the other chain
     * @return True if the hash is used, otherwise false
     */
    function containsHash(bytes32 txHash_, uint256 txNonce_) external view returns (bool) {
        bytes32 nonceHash_ = keccak256(abi.encodePacked(txHash_, txNonce_));

        return usedHashes[nonceHash_];
    }

    function _checkAndUpdateHashes(bytes32 txHash_, uint256 txNonce_) internal {
        bytes32 nonceHash_ = keccak256(abi.encodePacked(txHash_, txNonce_));

        require(!usedHashes[nonceHash_], "Hashes: the hash nonce is used");

        usedHashes[nonceHash_] = true;
    }
}
