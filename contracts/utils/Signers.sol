// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {Hashes} from "./Hashes.sol";

import {IBridge} from "../interfaces/bridge/IBridge.sol";

/**
 * @title Signers
 * @notice A contract that manages signers and signatures.
 *
 * This contract exposes two functions for authorization checks:
 * - `_checkOwnerOrSignatures` checks if the caller is the owner or if enough signatures provided by the signers, depending on the `isSignersMode` flag.
 * - `_checkSignatures` enforces signature validation.
 *
 * If the `isSignersMode` flag is set to `true`, the contract requires signatures from the signers for all protected functions listed in the `IBridge.ProtectedFunction` enumeration.
 * The only exceptions are the `pause` and `unpause` functions. If a pause manager is set, the contract will require transactions to be signed by the pause manager;
 * otherwise, if the pause manager is `address(0)` authorization will depend on the `isSignersMode` flag.
 *
 * IMPORTANT:
 * All signer addresses must differ in their first (most significant) 8 bits to pass bloom filtering.
 */
abstract contract Signers is Hashes, OwnableUpgradeable {
    using ECDSA for bytes32;
    using EnumerableSet for EnumerableSet.AddressSet;

    using Counters for Counters.Counter;

    /**
     * @notice The threshold of signatures required to authorize a transaction.
     */
    uint256 public signaturesThreshold;

    /**
     * @notice The flag that indicates whether the contract is in signers mode.
     */
    bool public isSignersMode;

    /**
     * @notice The set of signers.
     */
    EnumerableSet.AddressSet internal _signers;

    /**
     * @notice A mapping of nonces for each `ProtectedFunction`.
     * The nonce is incremented for each function call.
     *
     * The mapping key is the keccak256 hash of the function data and the function domain separator.
     * The list of domain separators is defined in the `IBridge.ProtectedFunction` enumeration.
     */
    mapping(bytes32 => Counters.Counter) private _nonces;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[46] private __gap;

    function __Signers_init(
        address[] calldata signers_,
        uint256 signaturesThreshold_,
        bool isSignersMode_
    ) public onlyInitializing {
        __Ownable_init();

        _addSigners(signers_);

        signaturesThreshold = signaturesThreshold_;
        isSignersMode = isSignersMode_;
    }

    /**
     * @notice Sets the threshold of signatures required to authorize a transaction.
     * @param signaturesThreshold_ The new signature threshold.
     * @param signatures_ The signatures of the signers; this field should be empty if the `isSignersMode` flag is set to ‘false’.
     *
     * @dev Depending on the `isSignersMode` flag, this function requires
     * either signatures from the signers or that the transaction be sent by the owner.
     *
     * | `isSignersMode` Flag | Callable By               |
     * |----------------------|---------------------------|
     * | `false`              | Owner                     |
     * | `true`               | Signers                   |
     */
    function setSignaturesThreshold(
        uint256 signaturesThreshold_,
        bytes[] calldata signatures_
    ) public {
        bytes32 functionData_ = keccak256(
            abi.encodePacked(
                IBridge.ProtectedFunction.SetSignaturesThreshold,
                signaturesThreshold_
            )
        );

        _checkOwnerOrSignatures(functionData_, signatures_);

        require(signaturesThreshold_ > 0, "Signers: invalid threshold");

        signaturesThreshold = signaturesThreshold_;
    }

    /**
     * @notice Adds new signers.
     * @param signers_ The new signers to be added.
     * @param signatures_ The signatures of the signers; this field should be empty if the `isSignersMode` flag is set to ‘false’.
     *
     * @dev Depending on the `isSignersMode` flag, this function requires
     * either signatures from the signers or that the transaction be sent by the owner.
     *
     * | `isSignersMode` Flag | Callable By               |
     * |----------------------|---------------------------|
     * | `false`              | Owner                     |
     * | `true`               | Signers                   |
     */
    function addSigners(address[] calldata signers_, bytes[] calldata signatures_) public {
        bytes32 functionData_ = keccak256(
            abi.encodePacked(IBridge.ProtectedFunction.AddSigners, signers_)
        );

        _checkOwnerOrSignatures(functionData_, signatures_);

        _addSigners(signers_);
    }

    /**
     * @notice Removes signers.
     * @param signers_ The signers to remove.
     * @param signatures_ The signatures of the signers; this field should be empty if the `isSignersMode` flag is set to ‘false’.
     *
     * @dev Depending on the `isSignersMode` flag, this function requires
     * either signatures from the signers or that the transaction be sent by the owner.
     *
     * | `isSignersMode` Flag | Callable By               |
     * |----------------------|---------------------------|
     * | `false`              | Owner                     |
     * | `true`               | Signers                   |
     */
    function removeSigners(address[] calldata signers_, bytes[] calldata signatures_) public {
        bytes32 functionData_ = keccak256(
            abi.encodePacked(IBridge.ProtectedFunction.RemoveSigners, signers_)
        );

        _checkOwnerOrSignatures(functionData_, signatures_);

        for (uint256 i = 0; i < signers_.length; i++) {
            _signers.remove(signers_[i]);
        }
    }

    /**
     * @notice Toggles the signers mode.
     * @param isSignersMode_ The new signers mode.
     * @param signatures_ The signatures of the signers; this field should be empty if the `isSignersMode` flag is set to ‘false’.
     *
     * @dev Depending on the `isSignersMode` flag, this function requires
     * either signatures from the signers or that the transaction be sent by the owner.
     *
     * | `isSignersMode` Flag | Callable By               |
     * |----------------------|---------------------------|
     * | `false`              | Owner                     |
     * | `true`               | Signers                   |
     */
    function toggleSignersMode(bool isSignersMode_, bytes[] calldata signatures_) public {
        bytes32 functionData_ = keccak256(
            abi.encodePacked(IBridge.ProtectedFunction.ToggleSignersMode, isSignersMode_)
        );

        _checkOwnerOrSignatures(functionData_, signatures_);

        isSignersMode = isSignersMode_;
    }

    /**
     * @notice Returns the current signers.
     */
    function getSigners() external view returns (address[] memory) {
        return _signers.values();
    }

    /**
     * @notice Returns the sign hash of a function call.
     * @param functionData_ The keccak256 hash of the function arguments.
     * @param nonce_ The nonce associated with the function call.
     * @param contract_ The address of the relevant contract.
     * @param chainId_ The chain ID where the contract is deployed.
     *
     * The function data consists of ABI-packed encoding, combining the domain separator (IBridge.ProtectedFunction) and the function arguments.
     */
    function getFunctionSignHash(
        bytes32 functionData_,
        uint256 nonce_,
        address contract_,
        uint256 chainId_
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(functionData_, nonce_, contract_, chainId_));
    }

    /**
     * @notice Returns the current nonce for `ProtectedFunction`. This value must be
     * included whenever a signature is generated.
     */
    function nonces(bytes32 functionData_) public view virtual returns (uint256) {
        return _nonces[functionData_].current();
    }

    function _addSigners(address[] calldata signers_) private {
        for (uint256 i = 0; i < signers_.length; i++) {
            require(signers_[i] != address(0), "Signers: zero signer");

            _signers.add(signers_[i]);
        }
    }

    function _checkSignatures(bytes32 signHash_, bytes[] memory signatures_) internal view {
        address[] memory signers_ = new address[](signatures_.length);

        for (uint256 i = 0; i < signatures_.length; i++) {
            signers_[i] = signHash_.toEthSignedMessageHash().recover(signatures_[i]);
        }

        _checkCorrectSigners(signers_);
    }

    /**
     * @notice Checks if the provided signers are correct.
     * @param signers_ The signers to be verified.
     *
     * For optimization purposes, this function employs a bitmap to identify duplicates.
     * It is mandatory for all signer addresses to differ in their first (most significant) 8 bits to pass Bloom filtering.
     * Additionally, the function verifies whether the threshold is met.
     */
    function _checkCorrectSigners(address[] memory signers_) private view {
        uint256 bitMap;

        for (uint256 i = 0; i < signers_.length; i++) {
            require(_signers.contains(signers_[i]), "Signers: invalid signer");

            uint256 bitKey = 2 ** (uint256(uint160(signers_[i])) >> 152);

            require(bitMap & bitKey == 0, "Signers: duplicate signers");

            bitMap |= bitKey;
        }

        require(signers_.length >= signaturesThreshold, "Signers: threshold is not met");
    }

    function _checkOwnerOrSignatures(
        bytes32 functionData_,
        bytes[] calldata signatures_
    ) internal {
        if (isSignersMode) {
            bytes32 signHash_ = getFunctionSignHash(
                functionData_,
                _useNonce(functionData_),
                address(this),
                block.chainid
            );

            _checkSignatures(signHash_, signatures_);
        } else {
            require(msg.sender == owner(), "Ownable: caller is not the owner");
        }
    }

    /**
     * @notice "Consume a nonce": return the current value and increment.
     */
    function _useNonce(bytes32 functionData_) internal virtual returns (uint256 current) {
        Counters.Counter storage nonce = _nonces[functionData_];
        current = nonce.current();
        nonce.increment();
    }
}
