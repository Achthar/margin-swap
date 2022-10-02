// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {IImplementationProvider} from "../../../interfaces/margin-account/IImplementationProvider.sol";

contract ImplementationProvider is IImplementationProvider {
    address public implementation;

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function getImplementation() external view returns (address) {
        return implementation;
    }
}
