// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ReverseResolver is Ownable {
    mapping(address => bytes32) domains;

    function setDomain(address _address, bytes32 _domain) public onlyOwner {
        domains[_address] = _domain;
    }

    function getDomain(address _address) public view returns (bytes32) {
        return domains[_address];
    }
}
