// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {CErc20Interface, ComptrollerInterface} from "../../external-protocols/compound/CTokenInterfaces.sol";

interface IDataProvider {
    function cToken(address _underlying, uint256 _protocolId) external returns (CErc20Interface);

    function cTokens(
        address _underlyingIn,
        address _underlyingOut,
        uint256 _protocolId
    ) external returns (CErc20Interface, CErc20Interface);

    function underlying(address _cToken) external returns (address);

    function getCollateralSwapData(
        address _underlyingFrom,
        address _underlyingTo,
        uint24 _fee,
        uint256 _protocolId
    )
        external
        returns (
            CErc20Interface cTokenFrom,
            CErc20Interface cTokenTo,
            address swapPool
        );

    function getV3Pool(
        address _underlyingFrom,
        address _underlyingTo,
        uint24 _fee
    ) external returns (address);

    function validatePoolAndFetchCTokens(
        address _pool,
        address _underlyingIn,
        address _underlyingOut,
        uint256 _protocolId
    ) external returns (CErc20Interface, CErc20Interface);

    function getComptroller(uint256 protocolId) external returns (ComptrollerInterface);
}
