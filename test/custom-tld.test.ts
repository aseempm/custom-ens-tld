import { ethers } from "hardhat";
import { labelhash, namehash, zeroHash } from "viem";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import {
  BaseRegistrarImplementation,
  CustomResolver,
  ENSRegistry,
  ReverseRegistrar,
  Root,
} from "../typechain-types";

describe("Custom TLD", () => {
  const NODE = namehash("aseem");

  let deployer: HardhatEthersSigner;
  let domainOwner: HardhatEthersSigner;
  let secondOnwer: HardhatEthersSigner;

  let root: Root;
  let registry: ENSRegistry;
  let registrar: BaseRegistrarImplementation;
  let resolver: CustomResolver;
  let reverseRegistrar: ReverseRegistrar;

  before(async () => {
    [deployer, domainOwner, secondOnwer] = await ethers.getSigners();

    registry = await ethers.deployContract("ENSRegistry");
    root = await ethers.deployContract("Root", [registry.target]);
    registrar = await ethers.deployContract("BaseRegistrarImplementation", [
      registry.target,
      NODE,
    ]);
    reverseRegistrar = await ethers.deployContract("ReverseRegistrar", [
      registry.target,
    ]);
    resolver = await ethers.deployContract("CustomResolver", [
      registry.target,
      reverseRegistrar.target,
    ]);

    await registry.setOwner(zeroHash, root.target);

    await root.setController(deployer, true);
    await root.setSubnodeOwner(labelhash("aseem"), registrar);
    await root.setSubnodeOwner(labelhash("reverse"), deployer);

    await registry.setSubnodeOwner(
      namehash("reverse"),
      labelhash("addr"),
      reverseRegistrar.target
    );

    await reverseRegistrar.setDefaultResolver(resolver.target);

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

  describe("Address Resolver", () => {
    it("should set address to domain by owner", async () => {
      const domain = namehash("live.aseem");
      await resolver
        .connect(domainOwner)
        ["setAddr(bytes32,address)"](domain, domainOwner);

      const address = await registry.resolver(NODE);

      const res = await ethers.getContractAt("Resolver", address);
      expect(await res["addr(bytes32)"](domain)).to.equal(domainOwner);
    });

    it("should not set address to domain by other account", async () => {
      const domain = namehash("live.aseem");
      await expect(
        resolver
          .connect(secondOnwer)
          ["setAddr(bytes32,address)"](domain, domainOwner)
      ).to.be.reverted;
    });
  });

  describe("Reverse Resolver", () => {
    it("should resolve reverse address to domain", async () => {
      const node = namehash(
        domainOwner.address.slice(2).toLowerCase() + ".addr.reverse"
      );
      await reverseRegistrar.connect(domainOwner).setName("live");
      expect(await resolver.name(node)).to.equal("live");
    });
  });
});
