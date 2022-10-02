// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../../libraries/LibStorage.sol";

/**
 * @title Delegator contract
 * @notice Allows users to name managers. These have rights over managing the account.
 * Managers cannot withdraw funds from the account, but open and close trading positions
 * @author Achthar
 */
contract DelegatorFacet is WithStorage {
    modifier onlyOwner() {
        LibStorage.enforceAccountOwner();
        _;
    }

    function addManager(address _newManager) external onlyOwner {
        us().managers[_newManager] = true;
    }

    function removeManager(address _manager) external onlyOwner {
        us().managers[_manager] = false;
    }

    function isManager(address _manager) external view returns (bool) {
        return us().managers[_manager];
    }
}
