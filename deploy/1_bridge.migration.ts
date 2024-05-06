import { ethers } from "ethers";

import { Deployer, Reporter } from "@solarity/hardhat-migrate";

import { Bridge__factory, ERC1967Proxy__factory } from "@ethers-v6";

import { deployQTumContract, getQTumContractAt, reportTransaction } from "@/scripts/qtumDeploy";

const OWNER = process.env.BRIDGE_OWNER!;
const validators = process.env.BRIDGE_VALIDATORS!.split(",");
const threshold = parseInt(process.env.BRIDGE_THRESHHOLD!, 10);

const networkMap: Record<string, any> = {
  "81": qtumDeployment,
  "8889": qtumDeployment,
  "1": ethereumDeployment,
  "11155111": ethereumDeployment,
};

export = async (deployer: Deployer) => {
  const chainId = await deployer.getChainId();

  let proxyAddress: string;
  let bridgeImplementationAddress: string;

  if (!networkMap[chainId.toString()]) {
    throw new Error(`ChainId ${chainId} not supported`);
  }

  [bridgeImplementationAddress, proxyAddress] = await networkMap[chainId.toString()](deployer);

  Reporter.reportContracts(["Bridge Implementation", bridgeImplementationAddress], ["Bridge Proxy", proxyAddress]);
};

async function qtumDeployment(_deployer: Deployer): Promise<[string, string]> {
  const bridgeImplementation = await deployQTumContract(Bridge__factory, "Bridge Implementation");
  const proxy = await deployQTumContract(ERC1967Proxy__factory, "Bridge Proxy", [
    bridgeImplementation.address,
    bridgeImplementation.interface.encodeFunctionData("__Bridge_init", [
      validators,
      ethers.ZeroAddress,
      threshold,
      false,
    ]),
  ]);

  const bridge = getQTumContractAt(Bridge__factory, "Bridge Proxy");

  const transferOwnership = await bridge.transferOwnership(OWNER);
  await reportTransaction(transferOwnership, "TransferOwnership Bridge");

  return [bridgeImplementation.address as string, proxy.address as string];
}

async function ethereumDeployment(deployer: Deployer): Promise<[string, string]> {
  const bridgeImplementation = await deployer.deploy(Bridge__factory);
  const proxy = await deployer.deploy(ERC1967Proxy__factory, [
    await bridgeImplementation.getAddress(),
    bridgeImplementation.interface.encodeFunctionData("__Bridge_init", [
      validators,
      ethers.ZeroAddress,
      threshold,
      false,
    ]),
  ]);

  const bridge = await deployer.deployed(Bridge__factory, await proxy.getAddress());

  await bridge.transferOwnership(OWNER);

  return [await bridgeImplementation.getAddress(), await proxy.getAddress()];
}
