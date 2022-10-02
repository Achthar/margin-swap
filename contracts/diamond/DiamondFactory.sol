// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./DelegatedDiamond.sol";
import {IAccountInit} from "./interfaces/IAccountInit.sol";

contract DiamondFactory {
    bool public initialized;

    // address that provides the logic for each account proxy deployed from this contract
    address public facetProvider;

    // address that provides the data regards to protocols and pools to the account
    address public dataProvider;

    // admin of this contract
    address public admin;

    // maps user address to account array
    mapping(address => address[]) private accounts;

    // maps account address to user who created the account
    mapping(address => address) public user;

    // all accounts created as an array
    address[] public allAccounts;

    event AccountCreated(address indexed owner, uint256 accountId);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Factory: Only admin can interact");
        _;
    }

    function initialize(address _facetProvider, address _dataProvider) external onlyAdmin {
        require(!initialized, "Factory: Already initialized");
        facetProvider = _facetProvider;
        dataProvider = _dataProvider;
        initialized = true;
    }

    function allAccountsLength() external view returns (uint256) {
        return allAccounts.length;
    }

    function createAccount() external returns (address account) {
        address owner = msg.sender; // save gas
        require(owner != address(0), "MarginAccount: CANNOT_BE_OWNED_BY_ZERO");

        uint256 accountId = allAccounts.length;
        // create salt for create2
        bytes32 _salt = keccak256(abi.encodePacked(owner, accountId));

        // deploy contract
        account = address(new DelegatedDiamond{salt: _salt}(facetProvider));

        // initialize data provider
        IAccountInit(account).init(dataProvider, owner);

        // add account to records
        accounts[owner].push(account);
        user[account] = owner;
        allAccounts.push(account);

        // emit creation event
        emit AccountCreated(owner, accountId);
    }

    function setFacetProvider(address _newProvider) external onlyAdmin {
        facetProvider = _newProvider;
    }

    function setDataProvider(address _newDataProvider) external onlyAdmin {
        dataProvider = _newDataProvider;
    }

    function getAccounts(address _owner) external view returns (address[] memory userAccounts) {
        userAccounts = accounts[_owner];
    }

    function getAccount(address _owner, uint256 _accountIndex) external view returns (address) {
        return accounts[_owner][_accountIndex];
    }
}
