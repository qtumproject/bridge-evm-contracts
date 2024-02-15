export interface QTumReceipt {
  to: string | null;
  from: string;
  contractAddress: string;
  transactionIndex: number;
  gasUsed: BigNumber;
  logsBloom: string;
  blockHash: string;
  transactionHash: string;
  logs: any[];
  blockNumber: number;
  confirmations: number;
  cumulativeGasUsed: BigNumber;
  effectiveGasPrice: BigNumber;
  status?: number;
  type: number;
  byzantium: boolean;
}

export interface DeployTransaction {
  hash: string;
  to: string;
  from: string;
  nonce: number;
  gasLimit: BigNumber;
  gasPrice: BigNumber;
  data: string;
  value: BigNumber;
  chainId: number;
  wait: (confirmations?: number) => Promise<QTumReceipt>;
}
