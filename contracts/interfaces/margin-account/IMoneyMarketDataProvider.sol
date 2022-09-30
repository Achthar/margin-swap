// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {CErc20Interface, ComptrollerInterface} from "../../external-protocols/compound/CTokenInterfaces.sol";

interface IMoneyMarketDataProvider {
    function cToken(address _underlying, uint256 _protocolId) external returns (CErc20Interface);

    function underlying(address _cToken) external returns (address);

    function getComptroller(uint256 _protocolId) external returns (ComptrollerInterface);
}
