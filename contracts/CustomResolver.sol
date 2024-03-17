// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ENSRegistry.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/Resolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/AddrResolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/NameResolver.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/profiles/DNSResolver.sol";

contract CustomResolver is AddrResolver, NameResolver, DNSResolver {
    ENS public ens;
    address public reverseRegistrar;

    constructor(ENS _ens, address _reverseRegistrar) {
        ens = _ens;
        reverseRegistrar = _reverseRegistrar;
    }

    function isAuthorised(
        bytes32 node
    ) internal view virtual override returns (bool) {
        if (reverseRegistrar == msg.sender) return true;
        return ens.owner(node) == msg.sender;
    }

    function supportsInterface(
        bytes4 interfaceID
    )
        public
        view
        override(AddrResolver, NameResolver, DNSResolver)
        returns (bool)
    {
        return super.supportsInterface(interfaceID);
    }
}
