// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../../../interfaces/margin-account/IMoneyMarketDataProvider.sol";

contract MoneyMarketDataProvider is IMoneyMarketDataProvider {
    address public dataAdmin;

    mapping(address => mapping(uint256 => address)) internal _cTokens;
    mapping(address => address) internal _underlyings;
    mapping(address => bool) cTokenIsValid;
    mapping(uint256 => address) internal _comptrollers;

    modifier onlyDataAdmin() {
        require(msg.sender == dataAdmin, "Only dataAdmin can interact");
        _;
    }

    constructor() {
        dataAdmin = msg.sender;
    }

    function addCToken(
        address _underlying,
        uint256 _protocolId,
        address _cToken
    ) external onlyDataAdmin {
        _cTokens[_underlying][_protocolId] = _cToken;
        _underlyings[_cToken] = _underlying;
        cTokenIsValid[_cToken] = true;
    }

    function cToken(address _underlying, uint256 _protocolId) external view returns (CErc20Interface) {
        address _cToken = _cTokens[_underlying][_protocolId];
        require(cTokenIsValid[_cToken], "invalid cToken");
        return CErc20Interface(_cToken);
    }

    function underlying(address _cToken) external view returns (address) {
        require(cTokenIsValid[_cToken], "invalid cToken");
        return _underlyings[_cToken];
    }

    function addComptroller(uint256 _protocolId, address _comptroller) external onlyDataAdmin {
        _comptrollers[_protocolId] = _comptroller;
    }

    function getComptroller(uint256 _protocolId) external view returns (ComptrollerInterface) {
        return ComptrollerInterface(_comptrollers[_protocolId]);
    }
}
