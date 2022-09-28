// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IProxyDeployer {
    function createAccount(address owner) external returns (address);
}
