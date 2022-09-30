// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IProxyInitializer {
    function _initialize(
        address _logicReference,
        address _dataProvider,
        address _owner
    ) external payable;
}
