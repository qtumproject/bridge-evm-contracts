// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import {IBridge} from "../interfaces/bridge/IBridge.sol";

/**
 * @title PauseManager Contract
 * @notice Extends PausableUpgradeable from OpenZeppelin, extends existing functionality be allowing delegation of pause
 * management to a specified address.
 */
abstract contract PauseManager is PausableUpgradeable {
    address private _pauseManager;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;

    /**
     * @notice Emitted when the pause manager is changed.
     * @param newManager The address of the new pause manager.
     */
    event PauseManagerChanged(address indexed newManager);

    /**
     * @notice Modifier to make a function callable only by the pause manager maintainer(s).
     */
    modifier onlyPauseManagerMaintainer(bytes32 functionData_, bytes[] calldata signatures_)
        virtual {
        _;
    }

    /**
     * @notice Modifier to make a function callable only by the current pause manager.
     */
    modifier onlyPauseManager(bytes32 functionData_, bytes[] calldata signatures_) virtual {
        _;
    }

    /**
     * @notice The function to initialize the contract.
     * @param initialManager_ The address of the initial pause manager. Must not be the zero address.
     */
    function __PauseManager_init(address initialManager_) internal onlyInitializing {
        __Pausable_init();

        _setPauseManager(initialManager_);
    }

    /**
     * @notice Pauses the contract.
     * Can only be called by the current pause manager.
     */
    function pause(
        bytes[] calldata signatures_
    )
        public
        onlyPauseManager(keccak256(abi.encodePacked(IBridge.ProtectedFunction.Pause)), signatures_)
    {
        _pause();
    }

    /**
     * @notice Unpauses the contract.
     * Can only be called by the current pause manager.
     */
    function unpause(
        bytes[] calldata signatures_
    )
        public
        onlyPauseManager(
            keccak256(abi.encodePacked(IBridge.ProtectedFunction.Unpause)),
            signatures_
        )
    {
        _unpause();
    }

    /**
     * @notice Transfers pause management to a new address.
     * Can only be called by a pause manager maintainer(s).
     *
     * @param newManager_ The address of the new pause manager. Must not be the zero address.
     */
    function setPauseManager(
        address newManager_,
        bytes[] calldata signatures_
    )
        public
        onlyPauseManagerMaintainer(
            keccak256(abi.encodePacked(IBridge.ProtectedFunction.SetPauseManager, newManager_)),
            signatures_
        )
    {
        _setPauseManager(newManager_);
    }

    /**
     * @notice Returns the current pause manager.
     */
    function pauseManager() public view returns (address) {
        return _pauseManager;
    }

    function _checkPauseManager() internal view {
        require(msg.sender == _pauseManager, "PauseManager: not the pause manager");
    }

    function _setPauseManager(address newManager_) private {
        _pauseManager = newManager_;

        emit PauseManagerChanged(newManager_);
    }
}
