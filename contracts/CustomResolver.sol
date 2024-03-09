// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ENSRegistry.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/Resolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/AddrResolver.sol";

contract CustomResolver is AddrResolver {
    ENS public ens;

    constructor(ENS _ens) {
        ens = _ens;
    }

    function isAuthorised(
        bytes32 node
    ) internal view virtual override returns (bool) {
        return ens.owner(node) == msg.sender;
    }
}
