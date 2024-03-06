import { ethers } from "hardhat";
import { ENSRegistry, CustomTLD } from "../typechain-types";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MyTLD", () => {
  const zero = ethers.encodeBytes32String("");
  const tld = ethers.encodeBytes32String(".aseem");
  const domain = ethers.encodeBytes32String("pro");

  let ens: ENSRegistry;
  let myTLD: CustomTLD;
  let owner: HardhatEthersSigner;
  let account1: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, account1] = await ethers.getSigners();

    ens = await ethers.deployContract("ENSRegistry");
    myTLD = await ethers.deployContract("CustomTLD", [tld, ens.target]);

    await ens.setOwner(zero, myTLD.target);
    await myTLD.registerTLD();
  });

  describe("Contract Configuration", () => {
    it("should get ENS Address from Contract", async () => {
      expect(await myTLD.ens()).to.equal(ens.target);
    });

    it("should get MyTLD as ENS Onwer of Rootnode", async () => {
      expect(await ens.owner(zero)).to.equal(myTLD.target);
    });

    it("should get Rootnode as .aseem", async () => {
      const tld = ethers.encodeBytes32String(".aseem");
      expect(await myTLD.rootNode()).to.equal(tld);
    });
  });

  describe("Domain Registration", () => {
    it("should register a domain", async () => {
      await expect(myTLD.registerDomain(domain))
        .to.emit(myTLD, "DomainRegistered")
        .withArgs(domain, owner);
    });

    it("should not register same domain again", async () => {
      await myTLD.registerDomain(domain);
      await expect(myTLD.registerDomain(domain)).to.be.revertedWith(
        "MyTLD: Domain is already registered"
      );
    });

    it("should get domain onwer", async () => {
      await myTLD.connect(account1).registerDomain(domain);
      expect(await myTLD.getDomainOwner(domain)).to.equal(account1);
    });

    it("should not register same domain by different signer", async () => {
      await myTLD.registerDomain(domain);
      await expect(
        myTLD.connect(account1).registerDomain(domain)
      ).to.be.revertedWith("MyTLD: Domain is already registered");
    });
  });

  describe("Resolver", () => {
    beforeEach(async () => {
      await myTLD.registerDomain(domain);
    });

    it("should assign address to domain by owner", async () => {
      await expect(myTLD.setAddress(domain, account1))
        .to.emit(myTLD, "DomainAssigned")
        .withArgs(domain, account1);
    });

    it("should not assign address to domain by non onwer", async () => {
      await expect(
        myTLD.connect(account1).setAddress(domain, account1)
      ).to.be.revertedWith("MyTLD: Not the owner of the domain");
    });

    it("should retrive address from domain", async () => {
      await myTLD.setAddress(domain, account1);
      expect(await myTLD.resolveAddress(domain)).equal(account1);
    });

    it("should retrive domain from address", async () => {
      await myTLD.setAddress(domain, account1);
      expect(await myTLD.resolveDomain(account1)).to.equal(domain);
    });
  });
});
