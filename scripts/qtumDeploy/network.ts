import * as hre from "hardhat";

import { Contract } from "ethers";

import { UserStorage } from "@solarity/hardhat-migrate";

import { QtumContractFactory, QtumProvider, QtumWallet } from "qtum-ethers-wrapper";

import { reportTransactionReceipt } from "@/scripts/qtumDeploy/reporter";

export function getQTumProvider() {
  if ("url" in hre.network.config) {
    return new QtumProvider(hre.network.config.url);
  } else {
    throw new Error(`No url for ${hre.network.name} found in hardhat.config.ts`);
  }
}

export function getQTUMSigner(): QtumWallet {
  const privateKey = process.env.QTUM_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("No private key found in .env");
  }

  return new QtumWallet(privateKey, getQTumProvider());
}

export async function deployQTumContract(
  contractFactory: { bytecode: string; abi: any },
  contractName: string,
  args: any[] = [],
) {
  if (UserStorage.has(contractName)) {
    console.log(`Contract ${contractName} already exists in UserStorage`);

    return getQTumContractAt(contractFactory, contractName);
  }

  const wallet = getQTUMSigner();

  const QTUMContractFactory = new QtumContractFactory(contractFactory.abi, contractFactory.bytecode, wallet);

  const instance = await QTUMContractFactory.deploy(...args);

  await reportTransactionReceipt(await instance.deployTransaction.wait(), contractName);

  if (UserStorage.has(contractName)) {
    throw new Error(`Contract ${contractName} already exists in UserStorage`);
  }

  UserStorage.set(contractName, instance.address);

  return instance;
}

export function getQTumContractAt(contractFactory: { bytecode: string; abi: any }, contractName: string) {
  return new Contract(UserStorage.get(contractName), contractFactory.abi, getQTUMSigner() as any);
}
