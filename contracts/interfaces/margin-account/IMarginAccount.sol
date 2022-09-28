// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IMarginAccount {
    function initialize(
        address _logic,
        address _owner
    ) external payable;
}
