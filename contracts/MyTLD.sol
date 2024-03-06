// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import "./IMyTLD.sol";
import "./AddressResolver.sol";
import "./ReverseResolver.sol";

contract MyTLD is IMyTLD {
    ENS public ens;
    bytes32 public rootNode;
    AddressResolver public addressResolver;
    ReverseResolver public reverseResolver;

    modifier checkDomain(bytes32 _domain) {
        bytes32 node = this.getNode(_domain);
        require(node == bytes32(0), "MyTLD: Domain is already registered");
        _;
    }

    constructor(bytes32 _rootNode, address _ens) {
        ens = ENS(_ens);
        rootNode = _rootNode;
        addressResolver = new AddressResolver();
        reverseResolver = new ReverseResolver();
    }

    function registerTLD() external {
        bytes32 node = keccak256(abi.encodePacked(rootNode));
        ens.setSubnodeOwner(bytes32(0), node, address(this));
        emit TLDRegistered();
    }

    function registerDomain(bytes32 _domain) external checkDomain(_domain) {
        bytes32 node = keccak256(
            abi.encodePacked(bytes32(0), keccak256(abi.encodePacked(rootNode)))
        );
        bytes32 label = keccak256(abi.encodePacked(_domain));

        ens.setSubnodeOwner(node, label, msg.sender);
        emit DomainRegistered(_domain, msg.sender);
    }

    function setAddress(bytes32 _domain, address _address) external {
        bytes32 node = getNode(_domain);
        require(
            ens.owner(node) == msg.sender,
            "MyTLD: Not the owner of the domain"
        );
        addressResolver.setAddress(node, _address);
        reverseResolver.setDomain(_address, _domain);
        emit DomainAssigned(_domain, _address);
    }

    function getDomainOwner(bytes32 _domain) external view returns (address) {
        bytes32 node = getNode(_domain);
        return ens.owner(node);
    }

    function resolveAddress(bytes32 _domain) external view returns (address) {
        bytes32 node = getNode(_domain);
        return addressResolver.getAddress(node);
    }

    function resolveDomain(address _address) external view returns (bytes32) {
        return reverseResolver.getDomain(_address);
    }

    function getNode(bytes32 _domain) public view returns (bytes32) {
        bytes32 node = keccak256(
            abi.encodePacked(
                keccak256(
                    abi.encodePacked(
                        bytes32(0),
                        keccak256(abi.encodePacked(rootNode))
                    )
                ),
                keccak256(abi.encodePacked(_domain))
            )
        );
        if (ens.recordExists(node)) return node;
        return bytes32(0);
    }
}
