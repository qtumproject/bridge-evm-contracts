// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Bridge} from "./Bridge.sol";

import {USDCManager} from "../utils/USDCManager.sol";

contract BridgeV2 is Bridge, USDCManager {}
