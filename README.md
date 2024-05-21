# Bridge EVM Contracts

## Contract Deployment

Firstly, you need to install the dependencies:

```bash
npm install
```

Then, create a `.env` file in the root directory. A template `.env.example` can be used.

### Environment Variables for Bridge EVM Contract Deployment

Here's a general explanation of the environment variables used for deploying Bridge EVM contracts:

#### Deployer Private Keys
- `PRIVATE_KEY`: The private key of the account that will be used to deploy the contracts on the Ethereum network.
(**Must have sufficient balance to cover transaction fees**; Must be in Hexadecimal format, e.g: `1234567890abcdef...`)
- `QTUM_PRIVATE_KEY`: If you are deploying the contracts on the Qtum network, you need to provide the private key of the account that will be used for deployment on Qtum. (**Must have sufficient balance to cover transaction fees**; Could be in WIF format, e.g: `cVjz1...` or Hexadecimal format, e.g: `1234567890abcdef...`)


#### RPC Configuration
- `INFURA_KEY`: This variable should hold your Infura project ID. You need to sign up for an Infura account and create a project to obtain the project ID.
- `QTUM_API_KEY`: If you are deploying on the Qtum network, you need to provide your Qtum API key.

#### Etherscan Configuration
- `ETHERSCAN_KEY`: The Etherscan API key is used to verify deployed contracts on Etherscan.

#### Bridge Contract Configuration
- `BRIDGE_OWNER`: This variable specifies the address of the owner of the bridge contract. (**Must** be an EVM Address)
- `BRIDGE_VALIDATORS`: This variable should contain a comma-separated list of addresses that are allowed to sign withdrawals on the bridge contract. (**Must** be EVM Addresses)
- `BRIDGE_THRESHOLD`: This variable determines the minimum number of signatures required from the validators to approve a withdrawal on the bridge contract.

### Deployment

Currently, the deployment scripts support only 4 networks: `Ethereum Mainnet`, `Ethereum Sepolia`, `QTum Mainnet`, and `QTum Testnet`.

There are predefined scripts that can be used to deploy the contracts on the specified network.

For example, to deploy the contracts on Ethereum Sepolia, you can run the following command:

```bash
npm run deploy-sepolia
```
Or, if you want to deploy the contracts on the QTum Testnet, you can run the following command:

```bash
npm run deploy-qtum-testnet
```

#### Contract Verification on Etherscan

To deploy and verify contracts simultaneously, you can use the following command:

```bash
npx hardhat migrate --network sepolia --verify
```

Or, you can verify the contracts on Etherscan **immediately** after the deployment on Sepolia by running the following command:

```bash
npx hardhat migrate:verify --network sepolia
```

