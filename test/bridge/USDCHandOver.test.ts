import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { wei } from "@scripts";
import { Reverter } from "@test-helpers";

import { BridgeV2, Bridge, BridgeV3, USDCTokenType } from "@ethers-v6";

describe("USDCHandOver", () => {
  const reverter = new Reverter();

  const baseBalance = wei("1000");

  let OWNER: SignerWithAddress;
  let FIRST: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let bridge: Bridge | BridgeV2 | BridgeV3;

  let erc20: USDCTokenType;

  before("setup", async () => {
    [OWNER, FIRST, SECOND] = await ethers.getSigners();

    const Bridge = await ethers.getContractFactory("Bridge");

    bridge = await Bridge.deploy();

    const Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await Proxy.deploy(await bridge.getAddress(), "0x");

    bridge = Bridge.attach(await proxy.getAddress()) as Bridge;

    await bridge.__Bridge_init([OWNER.address], ethers.ZeroAddress, "1", false);

    const ERC20MB = await ethers.getContractFactory("USDCTokenType");

    erc20 = await ERC20MB.deploy("Mock", "MK");
    await erc20.mint(await bridge.getAddress(), baseBalance);

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  it("should upgrade the Bridge and burn USDC only by the specified account", async () => {
    const NewBridge = await ethers.getContractFactory("BridgeV2");
    const newBridge = await NewBridge.deploy();

    const initData = newBridge.interface.encodeFunctionData("__USDCManager_init", [
      await erc20.getAddress(),
      SECOND.address,
    ]);

    await bridge.upgradeToWithSigAndCall(await newBridge.getAddress(), [], initData);

    bridge = NewBridge.attach(await bridge.getAddress()) as BridgeV2;

    expect(await bridge.getManagerAddress()).to.be.equal(SECOND.address);
    expect(await bridge.getLockedUSDCAddress()).to.be.equal(await erc20.getAddress());
    expect(await bridge.getInitializedVersion()).to.be.equal("1");

    await expect(bridge.__USDCManager_init(await erc20.getAddress(), SECOND.address)).to.be.revertedWith(
      "USDCManager: already initialized",
    );
    await expect(bridge.burnLockedUSDC()).to.be.revertedWith("USDCManager: only manager can call this method");

    expect(await erc20.balanceOf(await bridge.getAddress())).to.be.equal(baseBalance);

    await bridge.connect(SECOND).burnLockedUSDC();

    expect(await erc20.balanceOf(await bridge.getAddress())).to.be.equal(0);
  });

  it("should re-upgrade the Bridge", async () => {
    const BridgeV2 = await ethers.getContractFactory("BridgeV2");
    const bridgeV2 = await BridgeV2.deploy();

    let initData = bridgeV2.interface.encodeFunctionData("__USDCManager_init", [
      await erc20.getAddress(),
      SECOND.address,
    ]);
    await bridge.upgradeToWithSigAndCall(await bridgeV2.getAddress(), [], initData);

    bridge = BridgeV2.attach(await bridge.getAddress()) as BridgeV2;

    expect(await bridge.getManagerAddress()).to.be.equal(SECOND.address);

    const BridgeV3 = await ethers.getContractFactory("BridgeV3");
    const bridgeV3 = await BridgeV3.deploy();

    initData = bridgeV3.interface.encodeFunctionData("__USDCManager_init", [await erc20.getAddress(), FIRST.address]);
    await bridge.upgradeToWithSigAndCall(await bridgeV3.getAddress(), [], initData);

    expect(await bridge.getManagerAddress()).to.be.equal(FIRST.address);
  });
});
