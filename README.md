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

# USDC Hand Over Procedure

The steps below outline the procedure for transferring ownership of a bridged USDC token contract to Circle to facilitate an upgrade to native USDC.

As outlined in the [Bridged USDC Standard](https://github.com/circlefin/stablecoin-evm/blob/c582e58f691cc0cc7df1c85b6ac07267f8861520/doc/bridged_USDC_standard.md#bridged-usdc-standard) document:

1. The third-party team follows the standard to deploy their bridge contracts or retains the ability to upgrade their bridge contracts in the future to incorporate the required functionality.

This functionality is supported by the Upgradability Nature of the [Bridge Contract](https://github.com/qtumproject/bridge-evm-contracts/blob/3c50da4b2a753659de158fb8a1fb975ff3f97bdb/contracts/bridge/Bridge.sol#L18).

It follows the [Universal Upgradeable Proxy Standard](https://eips.ethereum.org/EIPS/eip-1822); therefore, the implementation can be upgraded either by the Bridge Owner or by the Bridge Validators (the second option is possible only if it was configured as such).

2. The third-party team follows the standard to deploy their bridged USDC token contract.

This option is also fully fulfilled by using specific deployment scripts implemented in the [USDC Deployment Scripts](https://github.com/qtumproject/usdc-deployment-script) repository.

Check out its [README](https://github.com/qtumproject/usdc-deployment-script?tab=readme-ov-file#usdc-deployment-scripts) for more details.

3. If and when a joint decision is made by the third-party team and Circle to securely transfer ownership of the bridged USDC token contract to Circle and perform an upgrade to native USDC, the following will take place:
- The third-party team will pause bridging activity and reconcile in-flight bridging activity to harmonize the total supply of native USDC locked on
  the origin chain with the total supply of bridged USDC on the destination chain.
- The third-party team will securely re-assign the contract roles of the bridged USDC token contract to Circle.
- Circle and the third-party team will jointly coordinate to burn the supply of native USDC locked in the bridge contract on the origin chain and upgrade the bridged USDC token contract on the destination chain to native USDC.

Option 3.1 can be achieved by using the [Pause Manager](https://github.com/qtumproject/bridge-evm-contracts/blob/main/contracts/utils/PauseManager.sol)
functionality. It exposes the `pause` function to stop any deposits and withdrawals to harmonize the total supply of native USDC.

Option 3.2 is natively supported by the [stablecoin-evm](https://github.com/circlefin/stablecoin-evm/tree/c582e58f691cc0cc7df1c85b6ac07267f8861520) contracts. It can be done by the Token Owner.

The first part of Option 3.3, `Circle and the third-party team will jointly coordinate to burn the supply of native USDC locked in the bridge contract on the origin chain`, is achieved by deploying the [BridgeV2]() contract and upgrading the already deployed Bridge contract using the BridgeV2 implementation.

During the upgrade, the `upgradeToWithSigAndCall` function MUST be used to prevent any security risks during the upgrade process.

## Commands to upgrade the Bridge contract to BridgeV2

Below, you will find two different ways to upgrade the Bridge contract to BridgeV2:

- [Process of manually upgrading the Bridge contract to BridgeV2](#process-of-manually-upgrading-the-bridge-contract-to-bridgev2)
- [Process of automatically upgrading the Bridge contract to BridgeV2](#process-of-automatic-upgrade-of-the-bridge-contract-to-bridgev2)

### Process of manually upgrading the Bridge contract to BridgeV2

The first step is to deploy the BridgeV2 contract using the process described below.

#### Commands to deploy the BridgeV2 contract

To deploy the BridgeV2 contract on the Ethereum Sepolia, you can run the following command:

```bash
npx hardhat migrate --network sepolia --only 10 --verify
```

A list of all available networks can be found in the [hardhat.config.js](https://github.com/qtumproject/bridge-evm-contracts/blob/3c50da4b2a753659de158fb8a1fb975ff3f97bdb/hardhat.config.ts) file.

#### Upgrade the Bridge contract to BridgeV2 via Etherscan or Gnosis Safe

To correctly upgrade the implementation of the Bridge contract to BridgeV2, you first must be the owner of the Bridge contract.

Alternatively, reach a consensus among validators to upgrade the Bridge contract (if Signers, aka Validators, are "working" as bridge owners).

You will need to call the `upgradeToWithSigAndCall` function of the Bridge contract with the following parameters:

- `newImplementation_`: The address of the new implementation contract. In this case, it is the newly deployed `BridgeV2` contract address.
- `signatures_`: If the [isSignersMode](https://github.com/qtumproject/bridge-evm-contracts/blob/3c50da4b2a753659de158fb8a1fb975ff3f97bdb/contracts/utils/Signers.sol#L42) is set to `true`, meaning that the validators act as bridge owners, it should be an array of signatures from the validators approving the upgrade. __Otherwise, pass an empty array.__
- `data_`: The initialization calldata that will be used to perform a call to immediately initialize the proxy contract.
  In our case, it will be the `__USDCManager_init` function call. To calculate the calldata, you can use the following command:

```bash
USDC_TOKEN_ADDRESS="0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF" CIRCLE_TRUSTED_ACCOUNT="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" npx hardhat run ./scripts/hardhat/calculate-bridgeV2-upgrade-data.ts
```

Replace `USDC_TOKEN_ADDRESS` and `CIRCLE_TRUSTED_ACCOUNT` with the actual addresses of the USDC token and Circle Trusted Account.

Example output:

```bash
Data to be passed to upgradeToWithSigAndCall as data parameter:  0x7778cd29000000000000000000000000ffffffffffffffffffffffffffffffffffffffff000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
```

Again, ensure that you replace `0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF` and `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` with the actual addresses!

#### Actual Bridge contract upgrade via Etherscan

After you have the `data` parameter, you can call the `upgradeToWithSigAndCall` function of the Bridge contract on Etherscan.

You need to go to [Etherscan](https://etherscan.io/) and find the **Proxy** of the Bridge contract. Then go to the `Write as Proxy` tab and find the `upgradeToWithSigAndCall` function.

If you are unable to see the `Write as Proxy` button, click the `Code` tab, find the `More Options` dropdown, click the `Is this a proxy?` button,
then click `Verify`, and finally, click `Save`.

After this sequence of steps, the `Write as Proxy` button should appear to the right of the `Write Contract` button.

At this point, you have all the details and can successfully upgrade the Bridge contract to BridgeV2.

> Ensure that you are the Bridge Owner or have a consensus among validators to perform this action.

#### Bridge contracts upgrade via Gnosis Safe

The process the same as with Etherscan, but instead of sending the transaction directly, you need to use the [Gnosis Safe Wallet](https://app.safe.global/welcome)

All you need to do, is to create a transaction to interact with the Bridge contract (should be a Bridge Proxy Address) on the Ethereum Network.

Bridge ABI can be found [here](https://github.com/qtumproject/bridge-evm-contracts/blob/db8288800fab385135af837cd757456b520bb414/abi/Bridge.json)

After that, you can pass there an ABI, select `upgradeToWithSigAndCall` function, and fill the parameters with the data you calculated before.

There, you will need to provide three parameters:
- `newImplementation_`: The address of the new implementation contract. In this case, it is the newly deployed `BridgeV2` contract address.
- `signatures_`: As soon as a Gnosis Safe account is employed, the signatures are not needed, so you need to pass an empty array.
- `data_`: The initialization calldata that will be used to perform a call to immediately initialize the proxy contract.

After, you could create a transaction and sign it with the Gnosis Safe account owners, reach a threshold and eventually execute it.

### Process of Automatic Upgrade of the Bridge Contract to BridgeV2

For this method to work, you MUST meet one of the following criteria:
- Be the owner of the Bridge contract and have access to the private key of the owner account.
- Gather a consensus among validators to upgrade the Bridge contract and receive the required number of signatures.

#### Commands to Upgrade the Bridge Contract to BridgeV2

To understand why `USDC_TOKEN_ADDRESS` and `CIRCLE_TRUSTED_ACCOUNT` are needed, refer to the [Ability to burn locked USDC](https://github.com/circlefin/stablecoin-evm/blob/c582e58f691cc0cc7df1c85b6ac07267f8861520/doc/bridged_USDC_standard.md#2-ability-to-burn-locked-usdc) section of the [Bridged USDC Standard](https://github.com/circlefin/stablecoin-evm/blob/c582e58f691cc0cc7df1c85b6ac07267f8861520/doc/bridged_USDC_standard.md#bridged-usdc-standard) document.

In the `.env` file, you need to add the following parameters:
- `PRIVATE_KEY` - The private key of the owner account that has enough balance to deploy the BridgeV2 contract and call the `upgradeToWithSigAndCall` function.
    - In case you are not the owner but have gathered enough signatures, you only need enough balance to cover the transaction fees.
- `USDC_TOKEN_ADDRESS` - The address of the USDC token contract.
- `CIRCLE_TRUSTED_ACCOUNT` - The address of the Circle Trusted Account.
- `BRIDGE_ADDRESS` - The address of the Bridge contract that you want to upgrade to BridgeV2.
- `SIGNATURES` - The number of signatures required to upgrade the Bridge contract to BridgeV2.
    - This option is needed only if the `isSignersMode` flag is set to `true` in the Bridge contract.

After that, you can run the following command to upgrade the Bridge contract to BridgeV2 on the Ethereum Sepolia network:

```bash
npx hardhat migrate --network sepolia --from 10
```

If you made a mistake in the variables configuration and migration 11 failed, you can fix those and then only run migration 11.

But, before that, you need to set the `BRIDGE_V2_ADDRESS` variable in the `.env` file to the address of the newly deployed BridgeV2 contract.

After that, you can run the following command to upgrade the Bridge contract to BridgeV2 on the Ethereum Sepolia network:

```bash
npx hardhat migrate --network sepolia --only 11
```

--- 

After the steps above (pausing and implementation upgrade), the Circle team can proceed with their part of burning the locked USDC tokens.

This step concludes the USDC Hand Over Procedure.

## Afterward BridgeV2 Contract Upgrade

After the Bridge is upgraded to V2, the Circle team can proceed with their part of burning the locked USDC tokens.

Make sure to upgrade Validator Nodes to stop supporting the USDC token.

After the Validators are upgraded, the Bridge can be unpaused on both sides and continue working with other supported tokens, if any.

# Bridge Management Methods

## Usage

All the functions below should be called directly on the Bridge contract.

> To call these functions on the Ethereum network the [Remix](https://remix.ethereum.org/) or [Etherscan](https://etherscan.io/) can be used.

> To call these functions on the QTum network the [QTum Web Wallet](https://wallet.bridge.qtum.net/send-to-contract) can be used.

Bridge ABI can be found [here](https://github.com/qtumproject/bridge-evm-contracts/blob/db8288800fab385135af837cd757456b520bb414/abi/Bridge.json)

## Methods

To check the current owner of the Bridge contract, you can call the `owner` method. 
To verify if the `signersMode` is enabled, use the `isSignersMode` method. 
Lastly, to check the current `pauseManager` address, call the `pauseManager` method. If the `pauseManager` address is the zero address, the `pauseManager` functionality can only be called by the owner of the Bridge contract.

All the functions below share the common argument `bytes[] calldata signatures_`, which is an array of signatures from the signers if required. If the `isSignersMode` flag is set to `true`, the signatures are required. Otherwise, the signatures are not required, and this argument should be an empty array (i.e., `[]`).

For the `pause` and `unpause` methods, if the `pauseManager` address is NOT the zero address, the `pauseManager` address can call these methods. These methods will be restricted only to the `pauseManager` account.

- `pause(bytes[] calldata signatures_)`: Pauses the contract.
    - `bytes[] calldata signatures_`: The signatures from the signers if required.
    - Requires either the owner, the pause manager, or sufficient signatures depending on the `isSignersMode` flag and the `pauseManager` address.

- `unpause(bytes[] calldata signatures_)`: Unpauses the contract.
    - `bytes[] calldata signatures_`: The signatures from the signers if required.
    - Requires either the owner, the pause manager, or sufficient signatures depending on the `isSignersMode` flag and the `pauseManager` address.

- `setPauseManager(address newManager_, bytes[] calldata signatures_)`: Transfers pause management to a new address.
    - `address newManager_`: The address of the new pause manager. May be set to the zero address.
    - `bytes[] calldata signatures_`: The signatures from the signers if required.

- `setSignaturesThreshold(uint256 signaturesThreshold_, bytes[] calldata signatures_)`: Sets the threshold of signatures required to authorize a transaction.
    - `uint256 signaturesThreshold_`: The new signature threshold.
    - `bytes[] calldata signatures_`: The signatures from the signers if required.

- `addSigners(address[] calldata signers_, bytes[] calldata signatures_)`: Adds new signers.
    - `address[] calldata signers_`: The new signers to be added.
    - `bytes[] calldata signatures_`: The signatures from the signers if required.

- `removeSigners(address[] calldata signers_, bytes[] calldata signatures_)`: Removes signers.
    - `address[] calldata signers_`: The signers to remove.
    - `bytes[] calldata signatures_`: The signatures from the signers if required.

- `toggleSignersMode(bool isSignersMode_, bytes[] calldata signatures_)`: Toggles the signers mode.
    - `bool isSignersMode_`: The new signers mode.
    - `bytes[] calldata signatures_`: The signatures from the signers if required.

- `upgradeToWithSig(address newImplementation_, bytes[] calldata signatures_)`: Upgrades the implementation of the proxy to `newImplementation`.
    - `address newImplementation_`: The address of the new implementation.
    - `bytes[] calldata signatures_`: The signatures from the signers if required.

- `upgradeToWithSigAndCall(address newImplementation_, bytes[] calldata signatures_, bytes calldata data_)`: Upgrades the implementation of the proxy to `newImplementation`, and subsequently executes the function call encoded in `data_`.
    - `address newImplementation_`: The address of the new implementation.
    - `bytes[] calldata signatures_`: The signatures from the signers if required.
    - `bytes calldata data_`: The data for the function call to be executed.
