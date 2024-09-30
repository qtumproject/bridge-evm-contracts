// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {USDCManagerV2} from "../utils/USDCManagerV2.sol";

import {Bridge} from "../../bridge/Bridge.sol";

contract BridgeV3 is Bridge, USDCManagerV2 {}
