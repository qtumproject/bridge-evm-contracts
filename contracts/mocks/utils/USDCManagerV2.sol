// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {USDCManager, IUSDCType} from "../../utils/USDCManager.sol";

contract USDCManagerV2 is USDCManager {
    function __USDCManager_init(
        IUSDCType lockedUSDCAddress_,
        address managerAddress_
    ) external override {
        USDCManagerStorage storage $ = _getUSDCManagerStorage();

        require($.initializedVersion < 2, "USDCManager: already initialized");
        $.initializedVersion = 2;

        $.managerAddress = managerAddress_;
        $.lockedUSDCAddress = lockedUSDCAddress_;
    }
}
