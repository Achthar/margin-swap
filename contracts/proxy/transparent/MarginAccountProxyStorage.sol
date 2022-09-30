// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.5.0) (proxy/ERC1967/ERC1967Upgrade.sol)

pragma solidity ^0.8.2;

import "../../interfaces/margin-account/IImplementationProvider.sol";

// solhint-disable max-line-length

abstract contract MarginAccountProxyStorageBase {
    /**
     * @dev Storage slot with the address of the implementation provider.
     */
    address public implementationProvider;

    /**
     * @dev Storage slot with the address of the data provider.
     */
    address public dataProvider;

    /**
     * @dev Storage slot with the owner of the contract.
     */
    address public accountOwner;

    /**
     * @dev Storage slot with the factory of the contract.
     */
    address public factory;
}

/**
 * @dev This abstract contract provides getters and event emitting update functions for
 * https://eips.ethereum.org/EIPS/eip-1967[EIP1967] slots.
 *
 * _Available since v4.1._
 *
 * @custom:oz-upgrades-unsafe-allow delegatecall
 */
abstract contract MarginAccountProxyStorage is MarginAccountProxyStorageBase {
    function __MarginAccountFetcherInit(address _implementationReference, address _dataProvider, address _owner) internal {
        implementationProvider = _implementationReference;
        dataProvider = _dataProvider;
        _changeOwnerInternal(_owner);
    }

    /**
     * @dev Returns the current implementation reference address.
     */
    function _getImplementation() internal view returns (address) {
        return IImplementationProvider(implementationProvider).getImplementation();
    }

    /**
     * @dev Returns the current implementation reference address.
     */
    function _getImplementationReference() internal view returns (address) {
        return implementationProvider;
    }

    /**
     * @dev Emitted when the admin account has changed.
     */
    event OwnerChanged(address previousOwner, address newOwner);

    /**
     * @dev Returns the current admin.
     */
    function _getOwner() internal view returns (address) {
        return accountOwner;
    }

    /**
     * @dev Stores a new address in the EIP1967 admin slot.
     */
    function _setOwner(address newOwner) private {
        require(newOwner != address(0), "ERC1967: new admin is the zero address");
        accountOwner = newOwner;
    }

    /**
     * @dev Changes the admin of the proxy.
     *
     * Emits an {OwnerChanged} event.
     */
    function _changeOwnerInternal(address newOwner) internal {
        emit OwnerChanged(_getOwner(), newOwner);
        _setOwner(newOwner);
    }

    /**
     * @dev Returns the factory.
     */
    function _getFactory() internal view returns (address) {
        return factory;
    }

    function _setFactory() internal {
        factory = msg.sender;
    }
}
