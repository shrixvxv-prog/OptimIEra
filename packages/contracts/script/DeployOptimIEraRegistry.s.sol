// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {OptimIEraRegistry} from "../src/OptimIEraRegistry.sol";

contract DeployOptimIEraRegistry is Script {
    function run() external returns (OptimIEraRegistry registry) {
        address registrar = vm.envAddress("OPTIMIERA_REGISTRAR_ADDRESS");
        vm.startBroadcast();
        registry = new OptimIEraRegistry(msg.sender, registrar);
        vm.stopBroadcast();
    }
}
