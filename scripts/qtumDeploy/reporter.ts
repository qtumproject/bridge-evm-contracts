import { QTumReceipt } from "@/types";
import { getQTumProvider } from "@/scripts/qtumDeploy/network";

import { sleep } from "@solarity/hardhat-migrate/dist/src/utils";

export async function reportTransaction(transaction: any, identifier: string, attempts = 20) {
  while (attempts > 0) {
    try {
      const qtumProvider = getQTumProvider();

      const txResponse = await qtumProvider.getTransaction(transaction.hash);

      await reportTransactionReceipt(await txResponse.wait(), identifier);

      return;
    } catch (e) {
      attempts--;

      await sleep(5000);
    }
  }

  throw new Error(`Failed to report transaction ${transaction.hash}`);
}

export async function reportTransactionReceipt(receipt: QTumReceipt, identifier: string) {
  console.log("\n" + underline(parseTransactionTitle(receipt, identifier)));

  let output = "";

  if (receipt.contractAddress) {
    output += `> contractAddress: ${receipt.contractAddress}\n`;
  }

  output += `> blockNumber: ${receipt.blockNumber}\n`;

  output += `> account: ${receipt.from}\n`;

  output += `> gasUsed: ${receipt.gasUsed}\n`;

  console.log(output);
}

function parseTransactionTitle(tx: QTumReceipt, instanceName: string): string {
  if (tx.to === null) {
    if (instanceName.split(":").length == 1) {
      return `Deploying ${instanceName}`;
    }

    return `Deploying${instanceName ? " " + instanceName.split(":")[1] : ""}`;
  }

  return `Transaction: ${instanceName}`;
}

function underline(str: string): string {
  return `\u001b[4m${str}\u001b[0m`;
}
