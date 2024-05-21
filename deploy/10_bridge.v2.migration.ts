import { Deployer, Reporter } from "@solarity/hardhat-migrate";

import { BridgeV2__factory } from "@ethers-v6";

import { deployQTumContract } from "@/scripts/qtumDeploy";

const networkMap: Record<string, any> = {
  "81": qtumDeployment,
  "8889": qtumDeployment,
  "1": ethereumDeployment,
  "11155111": ethereumDeployment,
};

export = async (deployer: Deployer) => {
  const chainId = await deployer.getChainId();

  let bridgeImplementationAddress: string;

  if (!networkMap[chainId.toString()]) {
    throw new Error(`ChainId ${chainId} not supported`);
  }

  [bridgeImplementationAddress] = await networkMap[chainId.toString()](deployer);

  Reporter.reportContracts(["Bridge V2 Implementation", bridgeImplementationAddress]);
};

async function qtumDeployment(_deployer: Deployer): Promise<[string]> {
  const bridgeImplementation = await deployQTumContract(BridgeV2__factory, "Bridge V2 Implementation");

  return [bridgeImplementation.address as string];
}

async function ethereumDeployment(deployer: Deployer): Promise<[string]> {
  const bridgeImplementation = await deployer.deploy(BridgeV2__factory);

  return [await bridgeImplementation.getAddress()];
}
