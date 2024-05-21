// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IUSDCType} from "../interfaces/tokens/IUSDCType.sol";

/**
 * @title USDCManager Contract
 *
 * This utility contract provides the functionality mentioned in the document to hand over control of bridging USDC contracts to Circle:
 * https://github.com/circlefin/stablecoin-evm/blob/c582e58f691cc0cc7df1c85b6ac07267f8861520/doc/bridged_USDC_standard.md#2-ability-to-burn-locked-usdc
 *
 * The contract offers the minimal functionality needed to upgrade the existing Bridge contract to a version that inherits from this contract.
 * It also allows for multiple upgrades if necessary.
 *
 * To prevent any upgradability issues, this contract uses [EIP7201](https://eips.ethereum.org/EIPS/eip-7201).
 *
 * The `USDCManagerStorage` structure represents all of the storage variables inside the contract, where:
 * - `lockedUSDCAddress` is the address of the USDC token contract on the chain.
 * - `managerAddress` is the EOA that will be allowed to call the `burnLockedUSDC` method.
 * - `initializedVersion` is the initialized version of the contract. It could be greater than 1 if the contract is upgraded multiple times.
 */
contract USDCManager {
    /// @custom:storage-location erc7201:qtum.storage.USDCManager
    struct USDCManagerStorage {
        IUSDCType lockedUSDCAddress;
        address managerAddress;
        uint256 initializedVersion;
    }

    // keccak256(abi.encode(uint256(keccak256("qtum.storage.USDCManager")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant USDCManagerStorageLocation =
        0x95d68dd162e0430e18daee917edf8bcd51a878f4fbf5d7005f16074d5f952e00;

    function _getUSDCManagerStorage() private pure returns (USDCManagerStorage storage $) {
        assembly {
            $.slot := USDCManagerStorageLocation
        }
    }

    modifier onlyManager() {
        _requireOnlyManager();
        _;
    }

    /**
     * @notice Initializer function that should be called in the same transaction as the proxy upgrade (`upgradeToWithSigAndCall` function should be used).
     * It is expected that `initializedVersion` could be greater than 1 in case the Bridge needs to be reinitialized, for example, due to an incorrect first initialization.
     */
    function __USDCManager_init(
        IUSDCType lockedUSDCAddress_,
        address managerAddress_
    ) external virtual {
        USDCManagerStorage storage $ = _getUSDCManagerStorage();

        require($.initializedVersion < 1, "USDCManager: already initialized");
        $.initializedVersion = 1;

        $.managerAddress = managerAddress_;
        $.lockedUSDCAddress = lockedUSDCAddress_;
    }

    /**
     * As mentioned in the [Ability to burn locked USDC](https://github.com/circlefin/stablecoin-evm/blob/c582e58f691cc0cc7df1c85b6ac07267f8861520/doc/bridged_USDC_standard.md#2-ability-to-burn-locked-usdc),
     * the `burnLockedUSDC` function must, at a minimum:
     * 1) Be only callable by an address that Circle specifies closer to the time of the upgrade.
     * 2) Burn the amount of USDC held by the bridge that corresponds precisely to the circulating total supply of bridged USDC established by the supply lock.
     *
     * Point 1) is implemented in the `onlyManager` modifier.
     * Point 2) is implemented by burning all the USDC tokens held by the contract.
     */
    function burnLockedUSDC() external onlyManager {
        USDCManagerStorage storage $ = _getUSDCManagerStorage();

        $.lockedUSDCAddress.burn($.lockedUSDCAddress.balanceOf(address(this)));
    }

    /**
     * @notice This function enforces that only the manager can call it.
     */
    function _requireOnlyManager() internal view {
        USDCManagerStorage storage $ = _getUSDCManagerStorage();

        require(msg.sender == $.managerAddress, "USDCManager: only manager can call this method");
    }
}
