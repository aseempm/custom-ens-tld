import { ethers } from "hardhat";

async function main() {
  const tld = ethers.encodeBytes32String(".aseem");
  const zero = ethers.encodeBytes32String("");

  const ens = await ethers.deployContract("ENSRegistry");
  await ens.waitForDeployment();
  console.log("ENS", ens.target);

  const myTLD = await ethers.deployContract("CustomTLD", [tld, ens.target]);
  await myTLD.waitForDeployment();
  console.log("TLD", myTLD.target);

  await ens.setOwner(zero, myTLD.target);
  await myTLD.registerTLD();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
