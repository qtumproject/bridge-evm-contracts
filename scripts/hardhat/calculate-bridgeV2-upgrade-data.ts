import { ethers } from "hardhat";

import { BridgeV2__factory } from "@ethers-v6";

const usdcTokenAddress = process.env.USDC_TOKEN_ADDRESS!;
const circleTrustedAccount = process.env.CIRCLE_TRUSTED_ACCOUNT!;

if (!ethers.isAddress(usdcTokenAddress!)) {
  throw new Error("Invalid USDC_TOKEN_ADDRESS");
}

if (!ethers.isAddress(circleTrustedAccount)) {
  throw new Error("Invalid CIRCLE_TRUSTED_ACCOUNT");
}

const initData = BridgeV2__factory.createInterface().encodeFunctionData("__USDCManager_init", [
  usdcTokenAddress,
  circleTrustedAccount,
]);

console.log("Data to be passed to upgradeToWithSigAndCall as data parameter: ", initData);
