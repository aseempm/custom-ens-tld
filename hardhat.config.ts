import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    local: {
      url: "http://localhost:8545",
    },
    env: {
      url: process.env.NETWORK_URL,
      accounts: [process.env.PRIVATE_KEY as string],
    },
  },
};

export default config;
