import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { wei } from "@scripts";
import { getSignature, ProtectedFunction, Reverter } from "@test-helpers";

import { ERC1967Proxy, Bridge, Bridge__factory } from "@ethers-v6";

describe("Upgradeable", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let bridge: Bridge;
  let newBridge: Bridge;

  let proxy: ERC1967Proxy;
  let proxyBridge: Bridge;

  before("setup", async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const Bridge = await ethers.getContractFactory("Bridge");
    const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");

    bridge = await Bridge.deploy();
    newBridge = await Bridge.deploy();

    proxy = await ERC1967Proxy.deploy(await bridge.getAddress(), "0x");
    proxyBridge = Bridge__factory.connect(await proxy.getAddress(), OWNER);

    await proxyBridge.__Bridge_init([], "1", false);

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  it("should revert if trying to upgrade with turned off method", async () => {
    await expect(proxyBridge.upgradeTo(await newBridge.getAddress())).to.be.rejectedWith(
      "Bridge: this upgrade method is turned off",
    );
  });

  it("should revert if trying to call `upgradeToWithSig` on implementation", async () => {
    await expect(newBridge.upgradeToWithSig(await newBridge.getAddress(), [])).to.be.rejectedWith(
      "Function must be called through delegatecall",
    );
  });

  it("should upgrade implementation", async () => {
    await expect(proxyBridge.upgradeToWithSig(await newBridge.getAddress(), [])).to.be.eventually.fulfilled;
  });

  it("should upgrade implementation with signers", async () => {
    await proxyBridge.addSigners([OWNER.address, SECOND.address], []);
    await proxyBridge.toggleSignersMode(true, []);

    const functionData = ethers.solidityPackedKeccak256(
      ["uint8", "address"],
      [ProtectedFunction.BridgeUpgrade, await newBridge.getAddress()],
    );

    const signHash = await proxyBridge.getFunctionSignHash(
      functionData,
      await proxyBridge.nonces(functionData),
      await proxyBridge.getAddress(),
      (await ethers.provider.getNetwork()).chainId,
    );

    const signature = await getSignature(OWNER, signHash);

    await expect(proxyBridge.upgradeToWithSig(await proxyBridge.getAddress(), [signature])).to.be.rejectedWith(
      "Signers: invalid signer",
    );

    await proxyBridge.upgradeToWithSig(await newBridge.getAddress(), [signature]);
  });

  it("should revert when call from non owner address", async () => {
    await expect(proxyBridge.connect(SECOND).upgradeToWithSig(await newBridge.getAddress(), [])).to.be.rejectedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should receive ether through proxy", async () => {
    await expect(
      OWNER.sendTransaction({
        to: await proxyBridge.getAddress(),
        value: wei("1"),
      }),
    ).to.be.eventually.fulfilled;
  });
});
