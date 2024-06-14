import { Deployer, Reporter } from "@solarity/hardhat-migrate";

import { BridgeV2__factory } from "@ethers-v6";

export = async (deployer: Deployer) => {
  const bridgeImplementation = await deployer.deploy(BridgeV2__factory);

  Reporter.reportContracts(["Bridge V2 Implementation", await bridgeImplementation.getAddress()]);
};
