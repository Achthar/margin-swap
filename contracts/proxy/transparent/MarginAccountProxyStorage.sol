// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.5.0) (proxy/ERC1967/ERC1967Upgrade.sol)

pragma solidity ^0.8.2;

import "../../libraries/Address.sol";
import "../../libraries/StorageSlot.sol";
import "../../interfaces/margin-account/IImplementationProvider.sol";

// solhint-disable max-line-length

abstract contract MarginAccountProxyStorageBase {
    /**
     * @dev Storage slot with the address of the current implementation.
     * This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1, and is
     * validated in the constructor.
     */
    bytes32 internal constant _IMPLEMENTATION_REFERENCE_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    /**
     * @dev Storage slot with the owner of the contract.
     * This is the keccak-256 hash of "eip1967.proxy.admin" subtracted by 1, and is
     * validated in the constructor.
     */
    bytes32 internal constant _OWNER_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    /**
     * @dev Storage slot with the factory of the contract.
     * This is the keccak-256 hash of "eip1967.proxy.factory" subtracted by 1, and is
     * validated in the constructor.
     */
    bytes32 internal constant _FACTORY_SLOT = 0x7a45a402e4cb6e08ebc196f20f66d5d30e67285a2a8aa80503fa409e727a4af2;
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
    function __MarginAccountFetcherInit(address implementationReference, address owner) internal {
        require(Address.isContract(implementationReference), "ERC1967: new implementation is not a contract");
        StorageSlot.getAddressSlot(_IMPLEMENTATION_REFERENCE_SLOT).value = implementationReference;
        _changeOwnerInternal(owner);
    }

    /**
     * @dev Returns the current implementation reference address.
     */
    function _getImplementationReference() internal view returns (address) {
        return IImplementationProvider(_getImplementation()).getImplementation();
    }

    /**
     * @dev Returns the current implementation reference address.
     */
    function _getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(_IMPLEMENTATION_REFERENCE_SLOT).value;
    }

    /**
     * @dev Emitted when the admin account has changed.
     */
    event OwnerChanged(address previousOwner, address newOwner);

    /**
     * @dev Returns the current admin.
     */
    function _getOwner() internal view returns (address) {
        return StorageSlot.getAddressSlot(_OWNER_SLOT).value;
    }

    /**
     * @dev Stores a new address in the EIP1967 admin slot.
     */
    function _setOwner(address newOwner) private {
        require(newOwner != address(0), "ERC1967: new admin is the zero address");
        StorageSlot.getAddressSlot(_OWNER_SLOT).value = newOwner;
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
        return StorageSlot.getAddressSlot(_FACTORY_SLOT).value;
    }

    function _setFactory() internal {
        StorageSlot.getAddressSlot(_FACTORY_SLOT).value = msg.sender;
    }
}
