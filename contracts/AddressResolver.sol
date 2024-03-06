// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AddressResolver is Ownable {
    mapping(bytes32 => address) addresses;

    function setAddress(bytes32 _node, address _address) public onlyOwner {
        addresses[_node] = _address;
    }

    function getAddress(bytes32 _node) public view returns (address) {
        return addresses[_node];
    }
}
