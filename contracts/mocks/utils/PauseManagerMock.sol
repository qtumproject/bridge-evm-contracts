// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {PauseManager} from "../../utils/PauseManager.sol";

contract PauseManagerMock is PauseManager, OwnableUpgradeable {
    modifier onlyPauseManagerMaintainer() override {
        _checkOwner();
        _;
    }

    function __PauseManagerMock_init(address initialOwner_) public initializer {
        __Ownable_init();

        __PauseManager_init(initialOwner_);
    }

    function __PauseManagerMockDirect_init(address initialOwner_) public {
        __PauseManager_init(initialOwner_);
    }

    function _checkOwner() internal view {
        require(owner() == _msgSender(), "PauseManagerMock: caller is not the owner");
    }
}

contract PauseManagerMockCoverage is PauseManager {
    function __PauseManagerMock_init(
        address initialOwner_
    ) public initializer onlyPauseManagerMaintainer {
        __PauseManager_init(initialOwner_);
    }
}
