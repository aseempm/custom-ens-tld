# CustomTLD
The project aims to create a Custom ENS Service with your TLD.

## Prerequisites
- NodeJs

## Contracts
The project consists of 4 contracts

- **ENSRegistry**: holds the ENS data
- **Root**: controls the root node
- **BaseRegistrar**: registrar for tld
- **ReverseRegistrar**: registrar for reverse domain
- **CustomResolver**: Resolves address and name

## Deploying Contracts
1. Clone the repo. `git clone https://github.com/aseempm/custom-ens-tld.git`
2. Install packages. `npm ci`
3. Copy `.env.template` to `.env` and configure them.
4. Deploy contract using `npx hardhat run scripts/01_deploy.ts --network env`

## Running Test
1. Clone the repo. `git clone https://github.com/aseempm/custom-ens-tld.git`
2. Install packages. `npm ci`
3. Deploy contract using `npx hardhat test`
