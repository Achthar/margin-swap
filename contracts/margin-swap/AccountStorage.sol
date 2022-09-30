// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../interfaces/margin-account/IMoneyMarketDataProvider.sol";
import {MarginAccountProxyStorageBase} from "../proxy/transparent/MarginAccountProxyStorage.sol";

/**
 * @title Margin account storage contract
 * @notice contains at least the interface to the protocol data provider that feeds
 * the accounts with valid cToken and underlying info and valid protocols to interact with
 */
abstract contract AccountStorage is MarginAccountProxyStorageBase {
    mapping(address => bool) public allowedPools;
    mapping(address => bool) public managers;
}

abstract contract OwnedAccount is AccountStorage {
    modifier onlyOwner() {
        require(msg.sender == accountOwner, "only the account owner can interact");
        _;
    }
}

abstract contract PoolPermitter is OwnedAccount {
    function allowPool(address _pool) public onlyOwner {
        allowedPools[_pool] = true;
    }
}

abstract contract AccountDataFetcher is PoolPermitter {
    function getCToken(address _underlying, uint256 _protocolId) internal returns (CErc20Interface) {
        return IMoneyMarketDataProvider(dataProvider).cToken(_underlying, _protocolId);
    }
}
