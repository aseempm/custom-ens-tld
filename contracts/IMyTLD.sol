// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMyTLD {
    event TLDRegistered();

    event DomainRegistered(bytes32 _domain, address indexed _owner);

    event DomainAssigned(bytes32 indexed _domain, address indexed _address);

    function registerTLD() external;

    function registerDomain(bytes32 _domain) external;

    function setAddress(bytes32 _domain, address _address) external;

    function getDomainOwner(bytes32 _domain) external view returns (address);

    function resolveAddress(bytes32 _domain) external view returns (address);

    function resolveDomain(address _address) external view returns (bytes32);
}
