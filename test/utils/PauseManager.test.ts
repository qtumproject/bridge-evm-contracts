import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { Reverter } from "@test-helpers";

import { PauseManagerMock } from "@ethers-v6";

describe("PauseManager", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let PAUSER: SignerWithAddress;

  let pauseManagerMock: PauseManagerMock;

  before("setup", async () => {
    [OWNER, PAUSER] = await ethers.getSigners();

    const PauseManagerMock = await ethers.getContractFactory("PauseManagerMock");
    pauseManagerMock = await PauseManagerMock.deploy();

    await pauseManagerMock.__PauseManagerMock_init(PAUSER.address);

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe("access", () => {
    it("should not directly initialize the contract", async () => {
      await expect(pauseManagerMock.__PauseManagerMockDirect_init(PAUSER.address)).to.be.rejectedWith(
        "Initializable: contract is not initializing",
      );
    });

    it("should revert if trying to initialize the contract with the zero address", async () => {
      const PauseManagerMock = await ethers.getContractFactory("PauseManagerMock");
      const pauseManagerMock = await PauseManagerMock.deploy();

      await expect(pauseManagerMock.__PauseManagerMock_init(ethers.ZeroAddress)).to.be.rejectedWith(
        "PauseManager: zero address",
      );
    });
  });

  describe("pause/unpause", () => {
    it("should pause the contract only by the Pause Manager", async () => {
      await expect(pauseManagerMock.connect(OWNER).pause()).to.be.rejectedWith("PauseManager: not the pause manager");

      await pauseManagerMock.connect(PAUSER).pause();

      expect(await pauseManagerMock.paused()).to.be.true;
    });

    it("should unpause the contract only by the Pause Manager", async () => {
      await pauseManagerMock.connect(PAUSER).pause();

      await expect(pauseManagerMock.connect(OWNER).unpause()).to.be.rejectedWith("PauseManager: not the pause manager");

      await pauseManagerMock.connect(PAUSER).unpause();

      expect(await pauseManagerMock.paused()).to.be.false;
    });
  });

  describe("setPauseManager", () => {
    it("should revert if trying to set the pause manager to the zero address", async () => {
      await expect(pauseManagerMock.connect(OWNER).setPauseManager(ethers.ZeroAddress)).to.be.rejectedWith(
        "PauseManager: zero address",
      );
    });

    it("should set the pause manager and emit 'PauseManagerChanged' event", async () => {
      await expect(pauseManagerMock.connect(OWNER).setPauseManager(OWNER.address))
        .to.emit(pauseManagerMock, "PauseManagerChanged")
        .withArgs(OWNER.address);

      expect(await pauseManagerMock.pauseManager()).to.equal(OWNER.address);
    });

    it("should revert if trying to set the pause manager not by the owner", async () => {
      await expect(pauseManagerMock.connect(PAUSER).setPauseManager(OWNER.address)).to.be.rejectedWith(
        "PauseManagerMock: caller is not the owner",
      );
    });
  });

  describe("coverage", () => {
    it("should call directly the 'onlyPauseManagerMaintainer' modifier", async () => {
      const PauseManagerMock = await ethers.getContractFactory("PauseManagerMockCoverage");
      const pauseManagerMock = await PauseManagerMock.deploy();

      await pauseManagerMock.__PauseManagerMock_init(PAUSER.address);
    });
  });
});
