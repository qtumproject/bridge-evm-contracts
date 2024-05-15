// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IUSDCType} from "../interfaces/tokens/IUSDCType.sol";

contract USDCManager {
    IUSDCType public lockedUSDCAddress;

    address public managerAddress;

    uint256 public initializedVersion;

    modifier onlyManager() {
        _requireOnlyManager();
        _;
    }

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
