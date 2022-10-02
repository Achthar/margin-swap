// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.16;

// THis diamond variant only
library LibDelegatedDiamond {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.diamond.storage");

    struct DelegatedDiamondStorage {
        address facetProvider;
        address factory;
    }

    function diamondStorage() internal pure returns (DelegatedDiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}
