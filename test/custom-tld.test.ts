import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { labelhash, namehash, zeroAddress, zeroHash } from "viem";
import {
  getAnchor,
  hexEncodeName,
  hexEncodeSignedSet,
  rootKeys,
  testRrset,
} from "./utils/dns";
import {
  BaseRegistrarImplementation,
  CustomResolver,
  DNSRegistrar,
  DNSSECImpl,
  DummyAlgorithm,
  DummyDigest,
  ENSRegistry,
  ReverseRegistrar,
  Root,
  SimplePublicSuffixList,
} from "../typechain-types";

describe("Custom TLD", () => {
  const TLD = "aseem";
  const NODE = namehash(TLD);

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
    await root.setSubnodeOwner(labelhash(TLD), registrar);
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

  describe("Domain Registrar", () => {
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

  describe("DNS", () => {
    let suffixes: SimplePublicSuffixList;
    let dummyAlgo: DummyAlgorithm;
    let dummyDig: DummyDigest;
    let dnssecImpl: DNSSECImpl;
    let dnsRegistrar: DNSRegistrar;

    before(async () => {
      suffixes = await ethers.deployContract("SimplePublicSuffixList");
      await suffixes.addPublicSuffixes([hexEncodeName(TLD)]);

      dnssecImpl = await ethers.deployContract("DNSSECImpl", [getAnchor()]);
      dummyAlgo = await ethers.deployContract("DummyAlgorithm");
      dummyDig = await ethers.deployContract("DummyDigest");

      await dnssecImpl.setAlgorithm(253, dummyAlgo.target);
      await dnssecImpl.setDigest(253, dummyDig.target);

      dnsRegistrar = await ethers.deployContract("DNSRegistrar", [
        zeroAddress,
        zeroAddress,
        dnssecImpl.target,
        suffixes.target,
        registry.target,
      ]);

      await root.setSubnodeOwner(labelhash(TLD), dnsRegistrar.target);
    });

    describe("Public Suffix List", () => {
      it("should succed on checking .aseem", async () => {
        expect(await suffixes.isPublicSuffix(hexEncodeName(TLD))).to.equal(
          true
        );
      });

      it("should fail on checking .abc", async () => {
        expect(await suffixes.isPublicSuffix(hexEncodeName("abc"))).to.equal(
          false
        );
      });
    });

    describe("DNSSEC Impl", async () => {
      it("should retrive the configured anchor", async () => {
        expect(await dnssecImpl.anchors()).to.equal(getAnchor());
      });

      it("should retrive the configured algorithm and digest", async () => {
        expect(await dnssecImpl.algorithms(253)).to.equal(dummyAlgo.target);
        expect(await dnssecImpl.digests(253)).to.equal(dummyDig.target);
      });
    });

    describe("DNS Registrar", () => {
      const validityPeriod = 2419200;
      const expiration = Date.now() / 1000 - 15 * 60 + validityPeriod;
      const inception = Date.now() / 1000 - 15 * 60;

      it("should claim dns by proof", async () => {
        const proof = [
          hexEncodeSignedSet(rootKeys(expiration, inception)),
          hexEncodeSignedSet(
            testRrset("live.aseem", domainOwner.address, expiration, inception)
          ),
        ];
        await dnsRegistrar
          .connect(domainOwner)
          .proveAndClaim(hexEncodeName("live.aseem"), proof);

        expect(await registry.owner(namehash("live.aseem"))).to.equal(
          domainOwner.address
        );
      });

      it("should not takeover dns by false proof", async () => {
        const test1Proof = [
          hexEncodeSignedSet(rootKeys(expiration, inception)),
          hexEncodeSignedSet(
            testRrset("test1.aseem", domainOwner.address, expiration, inception)
          ),
        ];

        expect(await registry.owner(namehash("test1.aseem"))).to.equal(
          zeroAddress
        );

        await dnsRegistrar
          .connect(domainOwner)
          .proveAndClaim(hexEncodeName("test1.aseem"), test1Proof);

        expect(await registry.owner(namehash("test1.aseem"))).to.equal(
          domainOwner
        );

        const test2Proof = [
          hexEncodeSignedSet(rootKeys(expiration, inception)),
          hexEncodeSignedSet(
            testRrset("test2.aseem", secondOnwer.address, expiration, inception)
          ),
        ];

        await expect(
          dnsRegistrar
            .connect(domainOwner)
            .proveAndClaim(hexEncodeName("test1.aseem"), test2Proof)
        ).to.be.revertedWithCustomError(dnsRegistrar, "NoOwnerRecordFound");
      });
    });
  });
});
