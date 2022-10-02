// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IManagement.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {WithStorage} from "../libraries/LibStorage.sol";
import {AccessControlled} from "../types/AccessControlled.sol";

contract ManagementFacet is IManagement, AccessControlled, WithStorage {
    /* ========== GOV ONLY ========== */

    function pushGovernor(address _newGovernor, bool _effectiveImmediately) external onlyGovernor {
        if (_effectiveImmediately) ms().governor = _newGovernor;
        ms().newGovernor = _newGovernor;
        emit GovernorPushed(ms().governor, ms().newGovernor, _effectiveImmediately);
    }

    function pushGuardian(address _newGuardian, bool _effectiveImmediately) external onlyGovernor {
        if (_effectiveImmediately) ms().guardian = _newGuardian;
        ms().newGuardian = _newGuardian;
        emit GuardianPushed(ms().guardian, ms().newGuardian, _effectiveImmediately);
    }

    function pushPolicy(address _newPolicy, bool _effectiveImmediately) external onlyGovernor {
        if (_effectiveImmediately) ms().policy = _newPolicy;
        ms().newPolicy = _newPolicy;
        emit PolicyPushed(ms().policy, ms().newPolicy, _effectiveImmediately);
    }

    function pushVault(address _newVault, bool _effectiveImmediately) external onlyGovernor {
        if (_effectiveImmediately) ms().vault = _newVault;
        ms().newVault = _newVault;
        emit VaultPushed(ms().vault, ms().newVault, _effectiveImmediately);
    }

    /* ========== PENDING ROLE ONLY ========== */

    function pullGovernor() external {
        require(msg.sender == ms().newGovernor, "!newGovernor");
        emit GovernorPulled(ms().governor, ms().newGovernor);
        ms().governor = ms().newGovernor;
    }

    function pullGuardian() external {
        require(msg.sender == ms().newGuardian, "!newGuard");
        emit GuardianPulled(ms().guardian, ms().newGuardian);
        ms().guardian = ms().newGuardian;
    }

    function pullPolicy() external {
        require(msg.sender == ms().newPolicy, "!newPolicy");
        emit PolicyPulled(ms().policy, ms().newPolicy);
        ms().policy = ms().newPolicy;
    }

    function pullVault() external {
        require(msg.sender == ms().newVault, "!newVault");
        emit VaultPulled(ms().vault, ms().newVault);
        ms().vault = ms().newVault;
    }

    /* ========== VIEWS ========== */

    function governor() external view returns (address) {
        return ms().governor;
    }

    function guardian() external view returns (address) {
        return ms().guardian;
    }

    function policy() external view returns (address) {
        return ms().policy;
    }

    function vault() external view returns (address) {
        return ms().vault;
    }
}
