import { ethers } from "hardhat";
import { getAnchor, hexEncodeName } from "../test/utils/dns";
import { labelhash, zeroAddress } from "viem";

async function main() {
  const TLD = "aseem";

  const root = await ethers.getContractAt("Root", process.env.ROOT!);
  const registry = await ethers.getContractAt(
    "BaseRegistrarImplementation",
    process.env.REGISTRY!
  );

  const suffixes = await ethers.deployContract("SimplePublicSuffixList");
  await suffixes.waitForDeployment();
  console.log("Suffix List", suffixes.target);

  await suffixes.addPublicSuffixes([hexEncodeName(TLD)]);

  const dnssecImpl = await ethers.deployContract("DNSSECImpl", [getAnchor()]);
  await dnssecImpl.waitForDeployment();
  console.log("DNSSEC Impl", dnssecImpl.target);

  const dummyAlgo = await ethers.deployContract("DummyAlgorithm");
  await dummyAlgo.waitForDeployment();
  console.log("Dummy Algo", dummyAlgo.target);

  const dummyDig = await ethers.deployContract("DummyDigest");
  await dummyDig.waitForDeployment();
  console.log("Dummy Digest", dummyDig.target);

  await dnssecImpl.setAlgorithm(253, dummyAlgo.target);
  await dnssecImpl.setDigest(253, dummyDig.target);

  const dnsRegistrar = await ethers.deployContract("DNSRegistrar", [
    zeroAddress,
    zeroAddress,
    dnssecImpl.target,
    suffixes.target,
    registry.target,
  ]);
  await dnsRegistrar.waitForDeployment();
  console.log("DNS Registrar", dnsRegistrar.target);

  await root.setSubnodeOwner(labelhash(TLD), dnsRegistrar.target);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
