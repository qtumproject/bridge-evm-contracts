// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IBridge} from "../interfaces/bridge/IBridge.sol";

import {ERC20Handler} from "../handlers/ERC20Handler.sol";
import {ERC721Handler} from "../handlers/ERC721Handler.sol";
import {ERC1155Handler} from "../handlers/ERC1155Handler.sol";
import {NativeHandler} from "../handlers/NativeHandler.sol";

import {Signers} from "../utils/Signers.sol";
import {PauseManager} from "../utils/PauseManager.sol";
import {UUPSSignableUpgradeable} from "../utils/UUPSSignableUpgradeable.sol";

/**
 * @title Bridge Contract
 */
contract Bridge is
    IBridge,
    UUPSSignableUpgradeable,
    Signers,
    PauseManager,
    ERC20Handler,
    ERC721Handler,
    ERC1155Handler,
    NativeHandler
{
    /**
     * @inheritdoc PauseManager
     */
    modifier onlyPauseManagerMaintainer(bytes32 functionData_, bytes[] calldata signatures_)
        override {
        _checkOwnerOrSignatures(functionData_, signatures_);
        _;
    }

    /**
     * @inheritdoc PauseManager
     */
    modifier onlyPauseManager(bytes32 functionData_, bytes[] calldata signatures_) override {
        if (pauseManager() != address(0)) {
            _checkPauseManager();
        } else {
            _checkOwnerOrSignatures(functionData_, signatures_);
        }
        _;
    }

    /**
     * @dev Ensures the function is callable only when the contract is not paused.
     */
    modifier onlyNotStopped()
        override(ERC20Handler, ERC721Handler, ERC1155Handler, NativeHandler) {
        _checkNotStopped();
        _;
    }

    /**
     * @dev Disables the ability to call initializers.
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract.
     * @param signers_ The initial signers. Refer to the `Signers` contract for detailed limitations and information.
     *
     * @param pauseManager_ The address of the initial pause manager, which may be set to the zero address.
     * When set to the zero address, the contract can be paused or unpaused by either the owner or the signers,
     * depending on the `isSignersMode` flag.
     *
     * @param signaturesThreshold_ The number of signatures required to withdraw tokens or to execute a protected function.
     * A list of all protected functions is available in the `IBridge` interface.
     *
     * @param isSignersMode_ The flag that enables or disables signers mode. When set to `true`,
     * the contract requires signatures from the signers for executing a protected function.
     */
    function __Bridge_init(
        address[] calldata signers_,
        address pauseManager_,
        uint256 signaturesThreshold_,
        bool isSignersMode_
    ) external initializer {
        __Signers_init(signers_, signaturesThreshold_, isSignersMode_);

        __PauseManager_init(pauseManager_);
    }

    /*
     * @inheritdoc UUPSUpgradeable
     */
    function _authorizeUpgrade(address) internal pure override {
        revert("Bridge: this upgrade method is turned off");
    }

    /*
     * @inheritdoc UUPSSignableUpgradeable
     *
     * @dev Depending on the `isSignersMode` flag in the `Signers` contract, this function requires
     * either signatures from the signers or that the transaction be sent by the owner.
     *
     * | `isSignersMode` Flag | Callable By               |
     * |----------------------|---------------------------|
     * | `false`              | Owner                     |
     * | `true`               | Signers                   |
     */
    function _authorizeUpgrade(
        address newImplementation,
        bytes[] calldata signatures_
    ) internal override {
        bytes32 functionData_ = keccak256(
            abi.encodePacked(IBridge.ProtectedFunction.BridgeUpgrade, newImplementation)
        );

        _checkOwnerOrSignatures(functionData_, signatures_);
    }

    /**
     * @inheritdoc IBridge
     */
    function withdrawERC20(
        address token_,
        uint256 amount_,
        address receiver_,
        bytes32 txHash_,
        uint256 txNonce_,
        ERC20BridgingType operationType_,
        bytes[] calldata signatures_
    ) external override onlyNotStopped {
        bytes32 signHash_ = getERC20SignHash(
            token_,
            amount_,
            receiver_,
            txHash_,
            txNonce_,
            block.chainid,
            operationType_
        );

        _checkAndUpdateHashes(txHash_, txNonce_);
        _checkSignatures(signHash_, signatures_);

        _withdrawERC20(token_, amount_, receiver_, operationType_);
    }

    /**
     * @inheritdoc IBridge
     */
    function withdrawERC721(
        address token_,
        uint256 tokenId_,
        address receiver_,
        bytes32 txHash_,
        uint256 txNonce_,
        string calldata tokenURI_,
        ERC721BridgingType operationType_,
        bytes[] calldata signatures_
    ) external override onlyNotStopped {
        bytes32 signHash_ = getERC721SignHash(
            token_,
            tokenId_,
            receiver_,
            txHash_,
            txNonce_,
            block.chainid,
            tokenURI_,
            operationType_
        );

        _checkAndUpdateHashes(txHash_, txNonce_);
        _checkSignatures(signHash_, signatures_);

        _withdrawERC721(token_, tokenId_, receiver_, tokenURI_, operationType_);
    }

    /**
     * @inheritdoc IBridge
     */
    function withdrawERC1155(
        address token_,
        uint256 tokenId_,
        uint256 amount_,
        address receiver_,
        bytes32 txHash_,
        uint256 txNonce_,
        string calldata tokenURI_,
        ERC1155BridgingType operationType_,
        bytes[] calldata signatures_
    ) external override onlyNotStopped {
        bytes32 signHash_ = getERC1155SignHash(
            token_,
            tokenId_,
            amount_,
            receiver_,
            txHash_,
            txNonce_,
            block.chainid,
            tokenURI_,
            operationType_
        );

        _checkAndUpdateHashes(txHash_, txNonce_);
        _checkSignatures(signHash_, signatures_);

        _withdrawERC1155(token_, tokenId_, amount_, receiver_, tokenURI_, operationType_);
    }

    /**
     * @inheritdoc IBridge
     */
    function withdrawNative(
        uint256 amount_,
        address receiver_,
        bytes32 txHash_,
        uint256 txNonce_,
        bytes[] calldata signatures_
    ) external override onlyNotStopped {
        bytes32 signHash_ = getNativeSignHash(
            amount_,
            receiver_,
            txHash_,
            txNonce_,
            block.chainid
        );

        _checkAndUpdateHashes(txHash_, txNonce_);
        _checkSignatures(signHash_, signatures_);

        _withdrawNative(amount_, receiver_);
    }

    /**
     * @notice The function to add a new hash
     * @param txHash_ The transaction hash from the other chain
     * @param txNonce_ The nonce of the transaction from the other chain
     * @param signatures_ The signatures of the signers; this field should be empty if the `isSignersMode` flag is set to ‘false’.
     *
     * @dev Depending on the `isSignersMode` flag in the `Signers` contract, this function requires
     * either signatures from the signers or that the transaction be sent by the owner.
     *
     * | `isSignersMode` Flag | Callable By               |
     * |----------------------|---------------------------|
     * | `false`              | Owner                     |
     * | `true`               | Signers                   |
     */
    function addHash(bytes32 txHash_, uint256 txNonce_, bytes[] calldata signatures_) external {
        bytes32 functionData_ = keccak256(
            abi.encodePacked(IBridge.ProtectedFunction.AddHash, txHash_, txNonce_)
        );

        _checkOwnerOrSignatures(functionData_, signatures_);

        _checkAndUpdateHashes(txHash_, txNonce_);
    }

    function _checkNotStopped() internal view {
        require(!paused(), "Bridge: operations are not allowed while paused");
    }
}
