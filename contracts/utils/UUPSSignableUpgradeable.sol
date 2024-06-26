// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title UUPSSignableUpgradeable
 * @notice A contract that uses the UUPS upgrade pattern and requires a signature to upgrade.
 */
abstract contract UUPSSignableUpgradeable is UUPSUpgradeable {
    /**
     * @notice Authorizes the upgrade to a new implementation via a signature.
     */
    function _authorizeUpgrade(
        address newImplementation_,
        bytes[] calldata signatures_
    ) internal virtual;

    /**
     * @notice Upgrade the implementation of the proxy to `newImplementation`.
     *
     * Calls {_authorizeUpgrade} with the provided `newImplementation` and `signatures`.
     *
     * Emits an {Upgraded} event.
     */
    function upgradeToWithSig(
        address newImplementation_,
        bytes[] calldata signatures_
    ) external virtual onlyProxy {
        _authorizeUpgrade(newImplementation_, signatures_);
        _upgradeToAndCallUUPS(newImplementation_, new bytes(0), false);
    }

    /**
     * @notice Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call
     * encoded in `data`.
     *
     * Calls {_authorizeUpgrade} with the provided `newImplementation` and `signatures`.
     *
     * Emits an {Upgraded} event.
     */
    function upgradeToWithSigAndCall(
        address newImplementation_,
        bytes[] calldata signatures_,
        bytes calldata data_
    ) external virtual onlyProxy {
        _authorizeUpgrade(newImplementation_, signatures_);
        _upgradeToAndCallUUPS(newImplementation_, data_, false);
    }
}
