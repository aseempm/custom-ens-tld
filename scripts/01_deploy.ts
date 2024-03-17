import { ethers } from "hardhat";
import { labelhash, namehash, zeroHash } from "viem";

async function main() {
  const [deployer] = await ethers.getSigners();

  const TLD = "aseem";
  const NODE = namehash(TLD);

  const registry = await ethers.deployContract("ENSRegistry");
  await registry.waitForDeployment();
  console.log("ENSResigtry", registry.target);

  const root = await ethers.deployContract("Root", [registry.target]);
  await root.waitForDeployment();
  console.log("Root", root.target);

  const registrar = await ethers.deployContract("BaseRegistrarImplementation", [
    registry.target,
    NODE,
  ]);
  await registrar.waitForDeployment();
  console.log("Registrar", registrar.target);

  const reverseRegistrar = await ethers.deployContract("ReverseRegistrar", [
    registry.target,
  ]);
  await reverseRegistrar.waitForDeployment();
  console.log("ReverseRegistrar", reverseRegistrar.target);

  const resolver = await ethers.deployContract("CustomResolver", [
    registry.target,
    reverseRegistrar.target,
  ]);
  await resolver.waitForDeployment();
  console.log("Resolver", resolver.target);

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
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
