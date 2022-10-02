// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./MoneyMarketDataProvider.sol";

contract MarginTradeDataProvider is MoneyMarketDataProvider {
    mapping(address => mapping(address => address)) public v3Pools;
    mapping(address => bool) public isValidPool;

    // function getCollateralSwapData(
    //     address _underlyingFrom,
    //     address _underlyingTo,
    //     uint24 _fee,
    //     uint256 _protocolId
    // )
    //     external
    //     returns (
    //         CErc20Interface cTokenFrom,
    //         CErc20Interface cTokenTo,
    //         address swapPool
    //     );

    function addV3Pool(
        address _token0,
        address _token1,
        address _pool
    ) external onlyDataAdmin {
        v3Pools[_token0][_token1] = _pool;
        v3Pools[_token1][_token0] = _pool;
        isValidPool[_pool] = true;
    }

    function getV3Pool(
        address _underlyingFrom,
        address _underlyingTo,
        uint24 _fee
    ) external view returns (address) {
        return v3Pools[_underlyingFrom][_underlyingTo];
    }

    function validatePoolAndFetchCTokens(
        address _pool,
        address _underlyingIn,
        address _underlyingOut,
        uint256 _protocolId
    ) external view returns (CErc20Interface _cTokenIn, CErc20Interface _cTokenOut) {
        require(isValidPool[_pool], "invalid caller");
        _cTokenIn = CErc20Interface(_cTokens[_underlyingIn][_protocolId]);
        _cTokenOut = CErc20Interface(_cTokens[_underlyingOut][_protocolId]);
    }
}
