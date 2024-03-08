import { ethers } from "hardhat";
import { labelhash, namehash } from "viem";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import {
  BaseRegistrarImplementation,
  ENSRegistry,
  OwnedResolver,
  Root,
} from "../typechain-types";

describe("Custom TLD", () => {
  let deployer: HardhatEthersSigner;
  let domainOwner: HardhatEthersSigner;
  let secondOnwer: HardhatEthersSigner;

  let root: Root;
  let registry: ENSRegistry;
  let registrar: BaseRegistrarImplementation;
  let resolver: OwnedResolver;

  before(async () => {
    const TLD = namehash("aseem");
    const ZERO = ethers.encodeBytes32String("");

    [deployer, domainOwner, secondOnwer] = await ethers.getSigners();

    registry = await ethers.deployContract("ENSRegistry");
    root = await ethers.deployContract("Root", [registry.target]);
    registrar = await ethers.deployContract("BaseRegistrarImplementation", [
      registry.target,
      TLD,
    ]);
    resolver = await ethers.deployContract("OwnedResolver");

    await registry.setOwner(ZERO, root.target);

    await root.setController(deployer, true);
    await root.setSubnodeOwner(labelhash("aseem"), registrar);

    await registrar.addController(deployer);
    await registrar.setResolver(resolver.target);
  });

  describe("Domain Registration", () => {
    const domain = namehash("live.aseem");
    const label = labelhash("live");

    it("should register domain as live.aseem", async () => {
      const txn = await registrar.register(label, domainOwner, 86400);
      const block = await ethers.provider.getBlock(txn.blockHash!);

      expect(await registry.owner(domain)).to.equal(domainOwner);
      expect(await registrar.ownerOf(label)).to.equal(domainOwner);
      expect(await registrar.nameExpires(label)).to.equal(
        block!.timestamp + 86400
      );
    });

    it("should not register same domain", async () => {
      await expect(registrar.register(label, domainOwner, 86400)).to.be
        .reverted;
    });

    it("should able to owner transfer the domain to new account", async () => {
      await registrar
        .connect(domainOwner)
        .transferFrom(domainOwner, secondOnwer, label);

      expect(await registrar.ownerOf(label)).to.equal(secondOnwer);

      await registrar
        .connect(secondOnwer)
        .transferFrom(secondOnwer, domainOwner, label);

      expect(await registrar.ownerOf(label)).to.equal(domainOwner);
    });
  });
});
