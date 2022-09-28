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
    // address of contract that provides data about tokens, protocols and pool
    address dataProvider;
}

abstract contract AccountDataFetcher is AccountStorage {
    function storageInit(address _dataProvider) internal {
        dataProvider = _dataProvider;
    }

    function getCToken(address _underlying, uint256 _protocolId) internal returns (CErc20Interface) {
        return IMoneyMarketDataProvider(dataProvider).cToken(_underlying, _protocolId);
    }
}
