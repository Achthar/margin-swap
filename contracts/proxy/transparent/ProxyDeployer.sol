// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../../interfaces/margin-account/IProxyDeployer.sol";
import "../../interfaces/margin-account/IMarginAccount.sol";
import "./MarginAccountProxy.sol";

contract ProxyDeployer is IProxyDeployer {
    bool public initialized;
    address public logicProvider;
    address public admin;

    mapping(address => address[]) public getAccounts;
    address[] public allAccounts;

    event AccountCreated(address indexed owner);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Factory: Only admin can interact");
        _;
    }

    function initialize(address _logicProvider) external onlyAdmin {
        require(!initialized, "Factory: Already initialized");
        logicProvider = _logicProvider;
        initialized = true;
    }

    function allAccountsLength() external view returns (uint256) {
        return allAccounts.length;
    }

    function createAccount(address _owner) external returns (address account) {
        address owner = _owner;
        require(owner != address(0), "MarginAccount: CANNOT_BE_OWNED_BY_ZERO");
        bytes32 _salt = keccak256(abi.encodePacked(owner, block.timestamp));

        account = address(new MarginAccountProxy{salt: _salt}());

        IMarginAccount(account).initialize(logicProvider, owner);
        getAccounts[owner].push(account);
        allAccounts.push(account);
        emit AccountCreated(owner);
    }

    function setLogicProvider(address _newProvider) external onlyAdmin {
        logicProvider = _newProvider;
    }
}
