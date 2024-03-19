// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {Hashes} from "./Hashes.sol";

import {IBridge} from "../interfaces/bridge/IBridge.sol";

abstract contract Signers is Hashes, OwnableUpgradeable {
    using ECDSA for bytes32;
    using EnumerableSet for EnumerableSet.AddressSet;

    using Counters for Counters.Counter;

    uint256 public signaturesThreshold;

    bool public isSignersMode;

    EnumerableSet.AddressSet internal _signers;

    mapping(IBridge.ProtectedFunction => Counters.Counter) private _nonces;

    modifier onlyOwnerOrSigners(
        IBridge.ProtectedFunction functionType_,
        bytes[] calldata signatures_
    ) {
        _checkOwnerOrSignatures(functionType_, signatures_);
        _;
    }

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

    function setSignaturesThreshold(
        uint256 signaturesThreshold_,
        bytes[] calldata signatures_
    ) public onlyOwnerOrSigners(IBridge.ProtectedFunction.SetSignersThreshold, signatures_) {
        require(signaturesThreshold_ > 0, "Signers: invalid threshold");

        signaturesThreshold = signaturesThreshold_;
    }

    function addSigners(
        address[] calldata signers_,
        bytes[] calldata signatures_
    ) public onlyOwnerOrSigners(IBridge.ProtectedFunction.AddSigners, signatures_) {
        _addSigners(signers_);
    }

    function removeSigners(
        address[] calldata signers_,
        bytes[] calldata signatures_
    ) public onlyOwnerOrSigners(IBridge.ProtectedFunction.RemoveSigners, signatures_) {
        for (uint256 i = 0; i < signers_.length; i++) {
            _signers.remove(signers_[i]);
        }
    }

    function toggleSignersMode(
        bool isSignersMode_,
        bytes[] calldata signatures_
    ) public onlyOwnerOrSigners(IBridge.ProtectedFunction.ToggleSignersMode, signatures_) {
        isSignersMode = isSignersMode_;
    }

    function getSigners() external view returns (address[] memory) {
        return _signers.values();
    }

    function getFunctionSignHash(
        IBridge.ProtectedFunction functionType_,
        uint256 nonce_,
        address contract_,
        uint256 chainId_
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(functionType_, nonce_, contract_, chainId_));
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
        IBridge.ProtectedFunction functionType_,
        bytes[] calldata signatures_
    ) internal {
        if (isSignersMode) {
            bytes32 signHash_ = getFunctionSignHash(
                functionType_,
                _useNonce(functionType_),
                address(this),
                block.chainid
            );

            _checkSignatures(signHash_, signatures_);
        } else {
            require(msg.sender == owner(), "Ownable: caller is not the owner");
        }
    }

    /**
     * @notice Returns the current nonce for `ProtectedFunction`. This value must be
     * included whenever a signature is generated.
     */
    function nonces(
        IBridge.ProtectedFunction functionType_
    ) public view virtual returns (uint256) {
        return _nonces[functionType_].current();
    }

    /**
     * @notice "Consume a nonce": return the current value and increment.
     */
    function _useNonce(
        IBridge.ProtectedFunction functionType_
    ) internal virtual returns (uint256 current) {
        Counters.Counter storage nonce = _nonces[functionType_];
        current = nonce.current();
        nonce.increment();
    }
}
