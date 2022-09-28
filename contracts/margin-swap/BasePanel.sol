// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./AccountStorage.sol";
import {CErc20Interface} from "../external-protocols/compound/CTokenInterfaces.sol";

/**
 * @title BasePanel contract
 * @notice Allows interaction of account contract with cTokens as defined by the Compound protocol 
 * @author Achthar
 */
abstract contract BasePanel is AccountDataFetcher {

    function mint(
        address _underlying,
        uint256 _protocolId,
        uint256 _amountToSupply
    ) external payable returns (uint256) {
        CErc20Interface cToken = getCToken(_underlying, _protocolId);
        return cToken.mint(_amountToSupply);
    }

    function redeem(
        address _underlying,
        uint256 _protocolId,
        uint256 _cAmountToRedeem
    ) external payable returns (uint256) {
        CErc20Interface cToken = getCToken(_underlying, _protocolId);
        return cToken.redeem(_cAmountToRedeem);
    }

    function redeemUnderlying(
        address _underlying,
        uint256 _protocolId,
        uint256 _amountToRedeem
    ) external payable returns (uint256) {
        CErc20Interface cToken = getCToken(_underlying, _protocolId);
        return cToken.redeemUnderlying(_amountToRedeem);
    }

    function borrow(
        address _underlying,
        uint256 _protocolId,
        uint256 _borrowAmount
    ) external returns (uint256) {
        CErc20Interface cToken = getCToken(_underlying, _protocolId);
        return cToken.borrow(_borrowAmount);
    }

    function repayBorrow(
        address _underlying,
        uint256 _protocolId,
        uint256 _repayAmount
    ) external returns (uint256) {
        CErc20Interface cToken = getCToken(_underlying, _protocolId);
        return cToken.borrow(_repayAmount);
    }
}
