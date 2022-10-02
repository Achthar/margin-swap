// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "../interfaces/IERC20.sol";
import "../interfaces/IAssetPricer.sol";

contract MockAssetPricer is IAssetPricer {
    IERC20 public REQ;

    uint256 scalar;

    constructor(address _req, uint256 _scalar) {
        require(_req != address(0), "Cannot be 0 address");
        REQ = IERC20(_req);
        scalar = _scalar;
    }

    function valuation(
        address _asset,
        address,
        uint256 _amount
    ) external view override returns (uint256) {
        return (scalar * _amount * 10**(REQ.decimals() - IERC20(_asset).decimals())) / 1e18;
    }

    function slashedValuation(
        address _asset,
        address,
        uint256 _amount
    ) external view override returns (uint256) {
        return (scalar * _amount * 10**(REQ.decimals() - IERC20(_asset).decimals())) / 1e18;
    }
}
