// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import {IBridge} from "../interfaces/bridge/IBridge.sol";

/**
 * @title PauseManager Contract
 * @notice Extends PausableUpgradeable from OpenZeppelin by allowing the delegation of pause management
 * to a specified address.
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
     * @notice Ensures the function is callable only by the pause manager maintainer(s).
     */
    modifier onlyPauseManagerMaintainer(bytes32 functionData_, bytes[] calldata signatures_)
        virtual {
        _;
    }

    /**
     * @notice Ensures the function is callable only by the current pause manager.
     * If the pause manager is not set, the function is callable by the owner or the signers.
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
     * @param signatures_ The signatures of the signers; this field should be empty
     * if the `isSignersMode` flag is set to ‘false’ in the `Signers` contract or if the `pauseManager` is not the zero address.
     *
     * @dev Depending on the `isSignersMode` flag in the `Signers` contract, this function requires
     * either signatures from the signers or that the transaction be sent by the owner.
     *
     * | `isSignersMode` Flag | `pauseManager` Address | Callable By               |
     * |----------------------|------------------------|---------------------------|
     * | `false`              | `address(0)`           | Owner                     |
     * | `false`              | Not `address(0)`       | Pause Manager             |
     * | `true`               | `address(0)`           | Signers                   |
     * | `true`               | Not `address(0)`       | Pause Manager             |
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
     * @param signatures_ The signatures of the signers; this field should be empty
     * if the `isSignersMode` flag is set to ‘false’ in the `Signers` contract or if the `pauseManager` is not the zero address.
     *
     * @dev Depending on the `isSignersMode` flag in the `Signers` contract, this function requires
     * either signatures from the signers or that the transaction be sent by the owner.
     *
     * | `isSignersMode` Flag | `pauseManager` Address | Callable By               |
     * |----------------------|------------------------|---------------------------|
     * | `false`              | `address(0)`           | Owner                     |
     * | `false`              | Not `address(0)`       | Pause Manager             |
     * | `true`               | `address(0)`           | Signers                   |
     * | `true`               | Not `address(0)`       | Pause Manager             |
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
     * @param newManager_ The address of the new pause manager, which may be the zero address.
     * When set to the zero address, the contract can be paused or unpaused by either the owner or the signers,
     * depending on the `isSignersMode` flag.
     *
     * @param signatures_ The signatures of the signers; this field should be empty if the `isSignersMode` flag is set to ‘false’ in the `Signers` contract.
     *
     * @dev Depending on the `isSignersMode` flag in the `Signers` contract, this function requires
     * either signatures from the signers or that the transaction be sent by the owner.
     *
     * | `isSignersMode` Flag | Callable By               |
     * |----------------------|---------------------------|
     * | `false`              | Owner                     |
     * | `true`               | Signers                   |
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
