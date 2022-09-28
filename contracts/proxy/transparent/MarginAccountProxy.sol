// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts v4.4.1 (proxy/transparent/TransparentUpgradeableProxy.sol)

pragma solidity ^0.8.0;

import "./MarginAccountProxyStorage.sol";

// solhint-disable

/**
 * @dev This contract implements a proxy that is supposed to be deployed by a factory.
 * - the logic is provided by the proxy contract factory
 *
 */
contract MarginAccountProxy is MarginAccountProxyStorage {
    constructor() {
        _setFactory();
    }

    /**
     * @dev Initializes an upgradeable proxy managed by `_owner`, backed by the implementation provided by `_logicReference`.
     */
    function _initialize(address _logicReference, address _owner) external payable {
        require(msg.sender == _getFactory(), "MarginAccount: FORBIDDEN"); // sufficient check
        __MarginAccountFetcherInit(_logicReference, _owner);
        assert(_OWNER_SLOT == bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1));
        _changeOwnerInternal(_owner);
    }

    /**
     * @dev Modifier used internally that will allow only the owner to execute functions.
     */
    modifier _onlyOwner() {
        require(msg.sender == _getOwner());
        _;
    }

    function _implementation() external view returns (address) {
        return _getImplementation();
    }

    /**
     * @dev Changes the owner of the proxy.
     *
     * Emits an {OwnerChanged} event.
     *
     * NOTE: Only the owner can call this function. See {ProxyOwner-changeProxyOwner}.
     */
    function _changeOwner(address newOwner) external virtual _onlyOwner {
        _changeOwnerInternal(newOwner);
    }

    /**
     * @dev Delegates the current call to `implementation`.
     *
     * This function does not return to its internal call site, it will return directly to the external caller.
     */
    function _delegate(address implementation) internal virtual {
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
            // delegatecall returns 0 on error.
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    /**
     * @dev Delegates the current call to the address returned by `_implementation()`.
     *
     * This function does not return to its internal call site, it will return directly to the external caller.
     */
    function _fallback() _onlyOwner internal virtual {
        _delegate(_getImplementation());
    }

    /**
     * @dev Fallback function that delegates calls to the address returned by `_implementation()`. Will run if no other
     * function in the contract matches the call data.
     */
    fallback() external payable virtual {
        _fallback();
    }

    /**
     * @dev Fallback function that delegates calls to the address returned by `_implementation()`. Will run if call data
     * is empty.
     */
    receive() external payable virtual {
        _fallback();
    }
}
