import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { getSignature, ProtectedFunction, Reverter } from "@test-helpers";

import { SignersMock } from "@ethers-v6";

describe("Signers", () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;
  let THIRD: SignerWithAddress;
  let FOURTH: SignerWithAddress;

  let signers: SignersMock;

  before("setup", async () => {
    [OWNER, SECOND, THIRD, FOURTH] = await ethers.getSigners();

    const Signers = await ethers.getContractFactory("SignersMock");
    signers = await Signers.deploy();

    await signers.__SignersMock_init([], "1", false);

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe("#access", () => {
    it("should not initialize twice", async () => {
      await expect(signers.__Signers_init([OWNER.address], "1", false)).to.be.rejectedWith(
        "Initializable: contract is not initializing",
      );
    });

    it("only owner should call these functions", async () => {
      await expect(signers.connect(SECOND).setSignaturesThreshold(1, [])).to.be.rejectedWith(
        "Ownable: caller is not the owner",
      );

      await expect(signers.connect(SECOND).addSigners([OWNER.address], [])).to.be.rejectedWith(
        "Ownable: caller is not the owner",
      );

      await expect(signers.connect(SECOND).removeSigners([OWNER.address], [])).to.be.rejectedWith(
        "Ownable: caller is not the owner",
      );
    });
  });

  describe("#setSignaturesThreshold", () => {
    it("should set signaturesThreshold", async () => {
      let expectedSignaturesThreshold = 5;

      await signers.setSignaturesThreshold(expectedSignaturesThreshold, []);

      expect(await signers.signaturesThreshold()).to.equal(expectedSignaturesThreshold);
    });

    it("should set signaturesThreshold with signers", async () => {
      await signers.addSigners([OWNER.address, SECOND.address], []);
      await signers.toggleSignersMode(true, []);

      const functionData = ethers.solidityPackedKeccak256(
        ["uint8", "uint256"],
        [ProtectedFunction.SetSignersThreshold, 2],
      );

      const signHash = await signers.getFunctionSignHash(
        functionData,
        await signers.nonces(functionData),
        await signers.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
      );

      const signature = await getSignature(OWNER, signHash);

      await expect(signers.setSignaturesThreshold(3, [signature])).to.be.rejectedWith("Signers: invalid signer");

      await expect(signers.setSignaturesThreshold(2, [signature])).to.be.fulfilled;
    });

    it("should revert when try to set signaturesThreshold to 0", async () => {
      let expectedSignaturesThreshold = 0;

      expect(signers.setSignaturesThreshold(expectedSignaturesThreshold, [])).to.be.rejectedWith(
        "Signers: invalid threshold",
      );
    });
  });

  describe("#toggleSignersMode", () => {
    it("should toggle signers mode", async () => {
      await signers.toggleSignersMode(true, []);

      expect(await signers.isSignersMode()).to.be.true;
    });

    it("should toggle signers mode with signers", async () => {
      await signers.addSigners([OWNER.address, SECOND.address], []);
      await signers.toggleSignersMode(true, []);

      const functionData = ethers.solidityPackedKeccak256(
        ["uint8", "bool"],
        [ProtectedFunction.ToggleSignersMode, false],
      );

      const signHash = await signers.getFunctionSignHash(
        functionData,
        await signers.nonces(functionData),
        await signers.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
      );

      const signature = await getSignature(OWNER, signHash);

      await expect(signers.toggleSignersMode(true, [signature])).to.be.rejectedWith("Signers: invalid signer");

      await expect(signers.toggleSignersMode(false, [signature])).to.be.fulfilled;
    });

    it("should revert when try to toggle signers mode by not owner", async () => {
      await expect(signers.connect(SECOND).toggleSignersMode(true, [])).to.be.rejectedWith(
        "Ownable: caller is not the owner",
      );
    });
  });

  describe("#addSigners", () => {
    it("should add signers", async () => {
      const expectedSigners = [OWNER.address, SECOND.address, THIRD.address];

      await signers.addSigners(expectedSigners, []);

      expect(await signers.getSigners()).to.be.deep.equal(expectedSigners);
    });

    it("should add signers with signers", async () => {
      await signers.addSigners([OWNER.address, SECOND.address], []);
      await signers.toggleSignersMode(true, []);

      const functionData = ethers.solidityPackedKeccak256(
        ["uint8", "address[]"],
        [ProtectedFunction.AddSigners, [THIRD.address]],
      );

      const signHash = await signers.getFunctionSignHash(
        functionData,
        await signers.nonces(functionData),
        await signers.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
      );

      const signature = await getSignature(OWNER, signHash);

      await expect(signers.addSigners([OWNER.address], [signature])).to.be.rejectedWith("Signers: invalid signer");

      await expect(signers.addSigners([THIRD.address], [signature])).to.be.fulfilled;
    });

    it("should revert when try add zero address signer", async () => {
      let expectedSigners = [OWNER.address, SECOND.address, ethers.ZeroAddress];

      expect(signers.addSigners(expectedSigners, [])).to.be.rejectedWith("Signers: zero signer");
    });
  });

  describe("#removeSigners", () => {
    it("should remove signers", async () => {
      let signersToAdd = [OWNER.address, SECOND.address, THIRD.address];
      let signersToRemove = [OWNER.address, SECOND.address];

      await signers.addSigners(signersToAdd, []);
      await signers.removeSigners(signersToRemove, []);

      expect(await signers.getSigners()).to.be.deep.equal([THIRD.address]);
    });

    it("should remove signers with signers", async () => {
      await signers.addSigners([OWNER.address, SECOND.address, THIRD.address], []);
      await signers.toggleSignersMode(true, []);

      const functionData = ethers.solidityPackedKeccak256(
        ["uint8", "address[]"],
        [ProtectedFunction.RemoveSigners, [OWNER.address]],
      );

      const signHash = await signers.getFunctionSignHash(
        functionData,
        await signers.nonces(functionData),
        await signers.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
      );

      const signature = await getSignature(OWNER, signHash);

      await expect(signers.removeSigners([THIRD.address], [signature])).to.be.rejectedWith("Signers: invalid signer");

      await signers.removeSigners([OWNER.address], [signature]);

      expect(await signers.getSigners()).to.be.deep.equal([THIRD.address, SECOND.address]);
    });
  });

  describe("checkSignatures", () => {
    let signersToAdd: string[];

    beforeEach("setup", async () => {
      signersToAdd = [OWNER.address, SECOND.address, THIRD.address];
      await signers.addSigners(signersToAdd, []);
    });

    async function getSigHash() {
      let expectedTxHash = "0xc4f46c912cc2a1f30891552ac72871ab0f0e977886852bdd5dccd221a595647d";
      let expectedNonce = "1794147";

      return ethers.keccak256(
        new ethers.AbiCoder().encode(
          ["address", "uint256", "address", "bytes32", "uint256", "uint256", "bool"],
          ["0x76e98f7d84603AEb97cd1c89A80A9e914f181679", "1", OWNER.address, expectedTxHash, expectedNonce, "98", true],
        ),
      );
    }

    it("should check signatures", async () => {
      await signers.addSigners([FOURTH.address], []);

      const signHash = await getSigHash();

      const signature1 = await getSignature(OWNER, signHash);
      const signature2 = await getSignature(SECOND, signHash);

      await signers.checkSignatures(signHash, [signature1, signature2]);
    });

    it("should revert when try duplicate signers", async () => {
      const signHash = await getSigHash();

      const signature = await getSignature(OWNER, signHash);

      await expect(signers.checkSignatures(signHash, [signature, signature])).to.be.rejectedWith(
        "Signers: duplicate signers",
      );
    });

    it("should revert when try sign by not signer", async () => {
      const signHash = await getSigHash();

      const signature = await getSignature(FOURTH, signHash);

      await expect(signers.checkSignatures(signHash, [signature])).to.be.rejectedWith("Signers: invalid signer");
    });

    it("should revert when try signers < threshold", async () => {
      const signHash = await getSigHash();

      await expect(signers.checkSignatures(signHash, [])).to.be.rejectedWith("Signers: threshold is not met");
    });

    it("should revert when pass incorrect", async () => {
      const signHash = await getSigHash();

      await expect(signers.checkSignatures(signHash, ["0x1234"])).to.be.rejectedWith("ECDSA: invalid signature length");
    });
  });
});
