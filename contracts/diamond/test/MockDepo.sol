// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import "../interfaces/ITreasury.sol";
import "../interfaces/IERC20.sol";

contract MockDepo {
    ITreasury treasury;

    constructor(address _treasury) {
        treasury = ITreasury(_treasury);
    }

    function depositForREQ(address _asset, uint256 _amount) public {
        treasury.deposit(_amount, _asset, 10);
    }

    function mintREQFor(address _asset, uint256 _amount) public {
        uint256 _vl = treasury.assetValue(_asset, _amount);
        IERC20(_asset).transferFrom(msg.sender, address(treasury), _amount);
        treasury.mint(msg.sender, _vl);
    }
}
