// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import {LibDelegatedDiamond} from "../libraries/LibDelegatedDiamond.sol";
import {
    LibStorage, 
    WithStorage, 
    GeneralStorage, 
    MarginSwapStorage, 
    UserAccountStorage, 
    DataProviderStorage
    } from "../libraries/LibStorage.sol";

import {IDiamondLoupe} from "../interfaces/IDiamondLoupe.sol";
import {IAccountInit} from "../interfaces/IAccountInit.sol";
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {IERC173} from "../interfaces/IERC173.sol";
import {IERC165} from "../interfaces/IERC165.sol";

// It is expected that this contract is customized if you want to deploy your diamond
// with data from a deployment script. Use the init function to initialize state variables
// of your diamond. Add parameters to the init funciton if you need to.

contract AccountInit is WithStorage, IAccountInit {
    // factory is set in the constructor
    constructor() {
        LibDelegatedDiamond.DelegatedDiamondStorage storage gs = LibDelegatedDiamond.diamondStorage();
        gs.factory = msg.sender;
    }

    // the initializer only initializes the facet provider, data provider and owner
    // the facets are provided by views in this facet provider contract
    // the diamond cut facet is not existing in this contract, it is implemented in the provider
    function init(address _dataProvider, address _owner) external override {
        require(LibDelegatedDiamond.diamondStorage().factory == msg.sender, "Only factory can in itialize");
        // here the account data is initialized
        // EIP-2535 specifies that the `diamondCut` function takes two optional
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface

        DataProviderStorage storage ps = LibStorage.dataProviderStorage();
        ps.dataProvider = _dataProvider;

        UserAccountStorage storage us = LibStorage.userAccountStorage();
        us.accountOwner = _owner;
    }
}
