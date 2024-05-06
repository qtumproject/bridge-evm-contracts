import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { wei } from "@scripts";
import { ERC20BridgingType, getSignature, ProtectedFunction, Reverter } from "@test-helpers";

import { ERC20MintableBurnable, Bridge, ERC721MintableBurnable, ERC1155MintableBurnable } from "@ethers-v6";

describe("Bridge", () => {
  const reverter = new Reverter();

  const baseBalance = wei("1000");
  const baseId = "5000";
  const tokenURI = "https://some.link";
  const txHash = "0xc4f46c912cc2a1f30891552ac72871ab0f0e977886852bdd5dccd221a595647d";
  const txNonce = "1794147";

  const hash = ethers.keccak256(ethers.solidityPacked(["bytes32", "uint256"], [txHash, txNonce]));

  let OWNER: SignerWithAddress;
  let PAUSER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let bridge: Bridge;
  let erc20: ERC20MintableBurnable;
  let erc721: ERC721MintableBurnable;
  let erc1155: ERC1155MintableBurnable;

  before("setup", async () => {
    [OWNER, PAUSER, SECOND] = await ethers.getSigners();

    const Bridge = await ethers.getContractFactory("Bridge");

    bridge = await Bridge.deploy();

    const Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await Proxy.deploy(await bridge.getAddress(), "0x");

    bridge = Bridge.attach(await proxy.getAddress()) as Bridge;

    await bridge.__Bridge_init([OWNER.address], PAUSER.address, "1", false);

    const ERC20MB = await ethers.getContractFactory("ERC20MintableBurnable");
    const ERC721MB = await ethers.getContractFactory("ERC721MintableBurnable");
    const ERC1155MB = await ethers.getContractFactory("ERC1155MintableBurnable");

    erc20 = await ERC20MB.deploy("Mock", "MK", OWNER.address);
    await erc20.mintTo(OWNER.address, baseBalance);
    await erc20.approve(await bridge.getAddress(), baseBalance);

    erc721 = await ERC721MB.deploy("Mock", "MK", OWNER.address, "");
    await erc721.mintTo(OWNER.address, baseId, tokenURI);
    await erc721.approve(await bridge.getAddress(), baseId);

    erc1155 = await ERC1155MB.deploy("Mock", "MK", "URI", OWNER.address);
    await erc1155.mintTo(OWNER.address, baseId, baseBalance, tokenURI);
    await erc1155.setApprovalForAll(await bridge.getAddress(), true);

    await erc20.transferOwnership(await bridge.getAddress());
    await erc721.transferOwnership(await bridge.getAddress());
    await erc1155.transferOwnership(await bridge.getAddress());

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe("access", () => {
    it("should not initialize twice", async () => {
      await expect(bridge.__Bridge_init([OWNER.address], PAUSER.address, "1", false)).to.be.rejectedWith(
        "Initializable: contract is already initialized",
      );
    });

    it("only owner should call these functions", async () => {
      await expect(erc20.mintTo(OWNER.address, 1)).to.be.rejectedWith("Ownable: caller is not the owner");
      await expect(erc721.mintTo(OWNER.address, 1, "")).to.be.rejectedWith("Ownable: caller is not the owner");
      await expect(erc1155.mintTo(OWNER.address, 1, 1, "")).to.be.rejectedWith("Ownable: caller is not the owner");

      await expect(erc20.burnFrom(OWNER.address, 1)).to.be.rejectedWith("Ownable: caller is not the owner");
      await expect(erc721.burnFrom(OWNER.address, 1)).to.be.rejectedWith("Ownable: caller is not the owner");
      await expect(erc1155.burnFrom(OWNER.address, 1, 1)).to.be.rejectedWith("Ownable: caller is not the owner");

      await expect(bridge.connect(SECOND).addHash(txHash, txNonce, [])).to.be.rejectedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("should set the pause manager only by the owner", async () => {
      await expect(bridge.connect(SECOND).setPauseManager(OWNER.address, [])).to.be.rejectedWith(
        "Ownable: caller is not the owner",
      );

      await bridge.connect(OWNER).setPauseManager(SECOND.address, []);
    });
  });

  describe("ERC20 flow", () => {
    it("should withdrawERC20", async () => {
      const expectedAmount = wei("100");
      const expectedOperationType = ERC20BridgingType.Wrapped;

      const signHash = await bridge.getERC20SignHash(
        await erc20.getAddress(),
        expectedAmount,
        OWNER,
        txHash,
        txNonce,
        (await ethers.provider.getNetwork()).chainId,
        expectedOperationType,
      );
      const signature = await getSignature(OWNER, signHash);

      await bridge.depositERC20(await erc20.getAddress(), expectedAmount, "receiver", "kovan", expectedOperationType);
      await bridge.withdrawERC20(
        await erc20.getAddress(),
        expectedAmount,
        OWNER,
        txHash,
        txNonce,
        expectedOperationType,
        [signature],
      );

      expect(await erc20.balanceOf(OWNER)).to.equal(baseBalance);
      expect(await erc20.balanceOf(await bridge.getAddress())).to.equal(0);

      expect(await bridge.usedHashes(hash)).to.be.true;
    });

    it("should revert if trying to deposit or withdraw when Bridge is paused", async () => {
      await bridge.connect(PAUSER).pause([]);

      await expect(
        bridge.depositERC20(await erc20.getAddress(), baseBalance, "receiver", "kovan", ERC20BridgingType.Wrapped),
      ).to.be.rejectedWith("Bridge: operations are not allowed while paused");

      await expect(
        bridge.withdrawERC20(
          await erc20.getAddress(),
          baseBalance,
          OWNER,
          txHash,
          txNonce,
          ERC20BridgingType.Wrapped,
          [],
        ),
      ).to.be.rejectedWith("Bridge: operations are not allowed while paused");
    });
  });

  describe("ERC721 flow", () => {
    it("should withdrawERC721", async () => {
      const expectedOperationType = ERC20BridgingType.Wrapped;

      const signHash = await bridge.getERC721SignHash(
        await erc721.getAddress(),
        baseId,
        OWNER,
        txHash,
        txNonce,
        (await ethers.provider.getNetwork()).chainId,
        tokenURI,
        expectedOperationType,
      );
      const signature = await getSignature(OWNER, signHash);

      await bridge.depositERC721(await erc721.getAddress(), baseId, "receiver", "kovan", expectedOperationType);
      await bridge.withdrawERC721(
        await erc721.getAddress(),
        baseId,
        OWNER,
        txHash,
        txNonce,
        tokenURI,
        expectedOperationType,
        [signature],
      );

      expect(await erc721.ownerOf(baseId)).to.equal(OWNER.address);
      expect(await erc721.tokenURI(baseId)).to.equal(tokenURI);
    });

    it("should revert if trying to deposit or withdraw when Bridge is paused", async () => {
      await bridge.connect(PAUSER).pause([]);

      await expect(
        bridge.depositERC721(await erc721.getAddress(), baseId, "receiver", "kovan", ERC20BridgingType.Wrapped),
      ).to.be.rejectedWith("Bridge: operations are not allowed while paused");

      await expect(
        bridge.withdrawERC721(
          await erc721.getAddress(),
          baseId,
          OWNER,
          txHash,
          txNonce,
          tokenURI,
          ERC20BridgingType.Wrapped,
          [],
        ),
      ).to.be.rejectedWith("Bridge: operations are not allowed while paused");
    });
  });

  describe("ERC1155 flow", () => {
    it("should withdrawERC1155", async () => {
      const expectedOperationType = ERC20BridgingType.Wrapped;

      const signHash = await bridge.getERC1155SignHash(
        await erc1155.getAddress(),
        baseId,
        baseBalance,
        OWNER,
        txHash,
        txNonce,
        (await ethers.provider.getNetwork()).chainId,
        tokenURI,
        expectedOperationType,
      );
      const signature = await getSignature(OWNER, signHash);

      await bridge.depositERC1155(
        await erc1155.getAddress(),
        baseId,
        baseBalance,
        "receiver",
        "kovan",
        expectedOperationType,
      );
      await bridge.withdrawERC1155(
        await erc1155.getAddress(),
        baseId,
        baseBalance,
        OWNER,
        txHash,
        txNonce,
        tokenURI,
        expectedOperationType,
        [signature],
      );

      expect(await erc1155.balanceOf(OWNER, baseId)).to.equal(baseBalance);
      expect(await bridge.usedHashes(hash)).to.be.true;
    });

    it("should revert if trying to deposit or withdraw when Bridge is paused", async () => {
      await bridge.connect(PAUSER).pause([]);

      await expect(
        bridge.depositERC1155(
          await erc1155.getAddress(),
          baseId,
          baseBalance,
          "receiver",
          "kovan",
          ERC20BridgingType.Wrapped,
        ),
      ).to.be.rejectedWith("Bridge: operations are not allowed while paused");

      await expect(
        bridge.withdrawERC1155(
          await erc1155.getAddress(),
          baseId,
          baseBalance,
          OWNER,
          txHash,
          txNonce,
          tokenURI,
          ERC20BridgingType.Wrapped,
          [],
        ),
      ).to.be.rejectedWith("Bridge: operations are not allowed while paused");
    });
  });

  describe("Native flow", () => {
    it("should withdrawNative", async () => {
      const signHash = await bridge.getNativeSignHash(
        baseBalance,
        OWNER,
        txHash,
        txNonce,
        (await ethers.provider.getNetwork()).chainId,
      );
      const signature = await getSignature(OWNER, signHash);

      await bridge.depositNative("receiver", "kovan", { value: baseBalance });
      await bridge.withdrawNative(baseBalance, OWNER, txHash, txNonce, [signature]);

      expect(await ethers.provider.getBalance(await bridge.getAddress())).to.equal(0);
      expect(await bridge.usedHashes(hash)).to.be.true;
    });

    it("should revert if trying to deposit or withdraw when Bridge is paused", async () => {
      await bridge.connect(PAUSER).pause([]);

      await expect(bridge.depositNative("receiver", "kovan", { value: baseBalance })).to.be.rejectedWith(
        "Bridge: operations are not allowed while paused",
      );

      await expect(bridge.withdrawNative(baseBalance, OWNER, txHash, txNonce, [])).to.be.rejectedWith(
        "Bridge: operations are not allowed while paused",
      );
    });
  });

  describe("add hash", () => {
    it("should add hash", async () => {
      expect(await bridge.usedHashes(hash)).to.be.false;

      await bridge.addHash(txHash, txNonce, []);

      expect(await bridge.usedHashes(hash)).to.be.true;
    });

    it("should add hash with signers", async () => {
      await bridge.toggleSignersMode(true, []);

      await expect(bridge.addHash(txHash, txNonce, [])).to.be.rejectedWith("Signers: threshold is not met");

      const functionData = ethers.solidityPackedKeccak256(
        ["uint8", "bytes32", "uint256"],
        [ProtectedFunction.AddHash, txHash, txNonce],
      );

      const signHash = await bridge.getFunctionSignHash(
        functionData,
        await bridge.nonces(functionData),
        await bridge.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
      );

      const signature = await getSignature(OWNER, signHash);

      await bridge.addHash(txHash, txNonce, [signature]);

      expect(await bridge.usedHashes(hash)).to.be.true;
    });
  });

  describe("PauseManager", () => {
    it("should set the pause manager and emit 'PauseManagerChanged' event with signers", async () => {
      await bridge.toggleSignersMode(true, []);

      await expect(bridge.setPauseManager(OWNER.address, [])).to.be.rejectedWith("Signers: threshold is not met");

      const functionData = ethers.solidityPackedKeccak256(
        ["uint8", "address"],
        [ProtectedFunction.SetPauseManager, OWNER.address],
      );

      const signHash = await bridge.getFunctionSignHash(
        functionData,
        await bridge.nonces(functionData),
        await bridge.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
      );

      const signature = await getSignature(OWNER, signHash);

      await expect(bridge.setPauseManager(OWNER.address, [signature]))
        .to.emit(bridge, "PauseManagerChanged")
        .withArgs(OWNER.address);

      expect(await bridge.pauseManager()).to.equal(OWNER.address);
    });

    it("should be able to set the signers as a pause manager and call pause/unpause", async () => {
      await bridge.setPauseManager(ethers.ZeroAddress, []);
      await bridge.toggleSignersMode(true, []);

      let functionData = ethers.solidityPackedKeccak256(["uint8"], [ProtectedFunction.Pause]);

      let signHash = await bridge.getFunctionSignHash(
        functionData,
        await bridge.nonces(functionData),
        await bridge.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
      );

      let signature = await getSignature(OWNER, signHash);

      await expect(bridge.pause([])).to.be.rejectedWith("Signers: threshold is not met");

      await bridge.pause([signature]);

      expect(await bridge.paused()).to.be.true;

      await expect(bridge.unpause([signature])).to.be.rejectedWith("Signers: invalid signer");

      functionData = ethers.solidityPackedKeccak256(["uint8"], [ProtectedFunction.Unpause]);

      signHash = await bridge.getFunctionSignHash(
        functionData,
        await bridge.nonces(functionData),
        await bridge.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
      );

      signature = await getSignature(OWNER, signHash);

      await bridge.unpause([signature]);

      expect(await bridge.paused()).to.be.false;
    });

    it("should be able to pause/unpause with pauseManager with `isSignersMode` true", async () => {
      await bridge.setPauseManager(SECOND.address, []);
      await bridge.toggleSignersMode(true, []);

      await expect(bridge.connect(SECOND).pause([])).to.be.eventually.fulfilled;
      await expect(bridge.connect(OWNER).pause([])).to.be.eventually.rejected;

      let functionData = ethers.solidityPackedKeccak256(["uint8"], [ProtectedFunction.Pause]);

      let signHash = await bridge.getFunctionSignHash(
        functionData,
        await bridge.nonces(functionData),
        await bridge.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
      );

      let signature = await getSignature(OWNER, signHash);

      await expect(bridge.pause([signature])).to.be.eventually.rejected;
    });
  });
});
