// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Bridge} from "./Bridge.sol";

import {USDCManager} from "../utils/USDCManager.sol";

/**
 * @title BridgeV2 Contract
 *
 * This contract inherits from USDCManager to simplify the USDC handover process according to:
 * https://github.com/circlefin/stablecoin-evm/blob/c582e58f691cc0cc7df1c85b6ac07267f8861520/doc/bridged_USDC_standard.md#2-ability-to-burn-locked-usdc
 */
contract BridgeV2 is Bridge, USDCManager {}
