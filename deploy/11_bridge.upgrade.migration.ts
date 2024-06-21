import { Deployer } from "@solarity/hardhat-migrate";

import { Bridge, Bridge__factory, BridgeV2, BridgeV2__factory } from "@ethers-v6";

/**
 * This part of the migration script can be run independently of the previous migrations, as well as immediately after the migration 10.
 *
 * If you intend to run the migration after the migration 10, you MUST set the BRIDGE_ADDRESS environment variable to the address of the Bridge contract (its Proxy).
 *
 * If you want to run the migration exclusively, you MUST set both the BRIDGE_ADDRESS and BRIDGE_V2_ADDRESS environment variables to the addresses of the Bridge contract (its Proxy) and the BridgeV2 contract, respectively.
 */
export = async (deployer: Deployer) => {
  const bridge: Bridge = await deployer.deployed(Bridge__factory, process.env.BRIDGE_ADDRESS || "Bridge Proxy");
  const bridgeImplementation: BridgeV2 = await deployer.deployed(BridgeV2__factory, process.env.BRIDGE_V2_ADDRESS);

  await checkIfUpgradeIsPossible(deployer, bridge);

  const initCallData = BridgeV2__factory.createInterface().encodeFunctionData("__USDCManager_init(address,address)", [
    process.env.USDC_TOKEN_ADDRESS!,
    process.env.CIRCLE_TRUSTED_ACCOUNT!,
  ]);

  const isSignerModeEnabled = await bridge.isSignersMode();

  if (isSignerModeEnabled) {
    const signatures = process.env.SIGNATURES!.split(",");

    await bridge.upgradeToWithSigAndCall(await bridgeImplementation.getAddress(), signatures, initCallData);
  } else {
    await bridge.upgradeToWithSigAndCall(await bridgeImplementation.getAddress(), [], initCallData);
  }
};

async function checkIfUpgradeIsPossible(deployer: Deployer, bridge: Bridge) {
  const signer = await deployer.getSigner();
  const currentBridgeOwner = await bridge.owner();
  const isSignerModeEnabled = await bridge.isSignersMode();

  if (isSignerModeEnabled && process.env.SIGNATURES === undefined) {
    throw new Error(
      "The Bridge contract is in Signers mode and SIGNATURES environment variable is not set. Upgrade is not possible by the EOA.",
    );
  }

  if (currentBridgeOwner !== (await signer.getAddress()) && !isSignerModeEnabled) {
    throw new Error(
      `The Bridge contract is not owned by the deployer: ${await signer.getAddress()}. Current owner: ${currentBridgeOwner}`,
    );
  }

  if (process.env.USDC_TOKEN_ADDRESS === undefined) {
    throw new Error("USDC_TOKEN_ADDRESS environment variable is not set");
  }

  if (process.env.CIRCLE_TRUSTED_ACCOUNT === undefined) {
    throw new Error("CIRCLE_TRUSTED_ACCOUNT environment variable is not set");
  }
}
