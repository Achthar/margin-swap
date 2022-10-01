// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./AccountStorage.sol";
import {CErc20Interface} from "../external-protocols/compound/CTokenInterfaces.sol";
import "../interfaces/margin-account/IMarginAccountInitializer.sol";
import "./libraries/TransferHelper.sol";
import "../interfaces/margin-account/IDataProvider.sol";

// solhint-disable max-line-length

/**
 * @title MoneyMarketOperator contract
 * @notice Allows interaction of account contract with cTokens as defined by the Compound protocol
 * @author Achthar
 */
contract MoneyMarketOperator is AccountDataFetcher, IMarginAccountInitializer {
    function initialize() external payable override {
        // storageInit(_dataProvider);
    }

    function approveUnderlyings(address[] memory _underlyings, uint256 _protocolId) public onlyOwner {
        for (uint256 i = 0; i < _underlyings.length; i++) {
            address _underlying = _underlyings[i];
            address _cToken = address(IDataProvider(dataProvider).cToken(_underlying, _protocolId));
            TransferHelper.safeApprove(_underlying, _cToken, type(uint256).max);
            TransferHelper.safeApprove(_cToken, _cToken, type(uint256).max);
        }
    }

    function enterMarkets(uint256 _protocolId, address[] memory cTokens) external onlyOwner {
        IDataProvider(dataProvider).getComptroller(_protocolId).enterMarkets(cTokens);
    }

    function mint(
        address _underlying,
        uint256 _protocolId,
        uint256 _amountToSupply
    ) external payable onlyOwner returns (uint256) {
        TransferHelper.safeTransferFrom(_underlying, msg.sender, address(this), _amountToSupply);
        CErc20Interface cToken = getCToken(_underlying, _protocolId);
        return cToken.mint(_amountToSupply);
    }

    function redeem(
        address _underlying,
        uint256 _protocolId,
        uint256 _cAmountToRedeem
    ) external payable onlyOwner returns (uint256) {
        CErc20Interface cToken = getCToken(_underlying, _protocolId);
        TransferHelper.safeTransferFrom(address(cToken), msg.sender, address(this), _cAmountToRedeem);
        return cToken.redeem(_cAmountToRedeem);
    }

    function redeemUnderlying(
        address _underlying,
        uint256 _protocolId,
        uint256 _amountToRedeem
    ) external payable onlyOwner returns (uint256) {
        TransferHelper.safeTransferFrom(_underlying, msg.sender, address(this), _amountToRedeem);
        return getCToken(_underlying, _protocolId).redeemUnderlying(_amountToRedeem);
    }

    function borrow(
        address _underlying,
        uint256 _protocolId,
        uint256 _borrowAmount
    ) external onlyOwner returns (uint256) {
        return getCToken(_underlying, _protocolId).borrow(_borrowAmount);
    }

    function repayBorrow(
        address _underlying,
        uint256 _protocolId,
        uint256 _repayAmount
    ) external onlyOwner returns (uint256) {
        TransferHelper.safeTransferFrom(_underlying, msg.sender, address(this), _repayAmount);
        return getCToken(_underlying, _protocolId).repayBorrow(_repayAmount);
    }
}
