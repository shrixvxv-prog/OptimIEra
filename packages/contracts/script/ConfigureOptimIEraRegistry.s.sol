// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {OptimIEraRegistry} from "../src/OptimIEraRegistry.sol";

contract ConfigureOptimIEraRegistry is Script {
    function run() external {
        address registryAddress = vm.envAddress("OPTIMIERA_REGISTRY_ADDRESS");
        address registrar = vm.envAddress("OPTIMIERA_REGISTRAR_ADDRESS");
        vm.startBroadcast();
        OptimIEraRegistry(registryAddress).grantRole(keccak256("OPTIMIERA_REGISTRAR_ROLE"), registrar);
        vm.stopBroadcast();
    }
}
