// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IUSDCType} from "../interfaces/tokens/IUSDCType.sol";

/**
 * @title USDCManager Contract
 *
 * This is a utility contract, that provides enough functionality mentioned in the document to hand over control of bridging USDC contracts to Circle:
 * https://github.com/circlefin/stablecoin-evm/blob/c582e58f691cc0cc7df1c85b6ac07267f8861520/doc/bridged_USDC_standard.md#2-ability-to-burn-locked-usdc
 *
 * This contracts provides minimal functionality needed to upgrade existing Brdige contract to the version of the Bridge contracts, that also inherits from
 * this contract. Also makes it possible to upgrade a few times if needed.
 */
contract USDCManager {
    /**
     * @notice The address of the USDC token contract on the chain.
     */
    IUSDCType public lockedUSDCAddress;

    /**
     * @notice The EOA that will be allowed to call the `burnLockedUSDC` method.
     */
    address public managerAddress;

    /**
     * @notice The initialized version of the contract.
     * Could be bigger than 1 if the contract is upgraded a few times.
     */
    uint256 public initializedVersion;

    modifier onlyManager() {
        _requireOnlyManager();
        _;
    }

    /****/
    function __USDCManager_init(
        IUSDCType lockedUSDCAddress_,
        address managerAddress_
    ) external virtual {
        require(initializedVersion < 1, "USDCManager: already initialized");
        initializedVersion = 1;

        managerAddress = managerAddress_;
        lockedUSDCAddress = lockedUSDCAddress_;
    }

    function burnLockedUSDC() external onlyManager {
        lockedUSDCAddress.burn(lockedUSDCAddress.balanceOf(address(this)));
    }

    function _requireOnlyManager() internal view {
        require(msg.sender == managerAddress, "USDCManager: only manager can call this method");
    }
}
