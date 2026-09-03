// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {OptimIEraRegistry} from "../src/OptimIEraRegistry.sol";

/// @notice Mainnet-only deployment. The private key is read from the server-side
/// environment by Foundry and is never accepted as a command-line argument.
contract DeployOptimIEraRegistryMainnet is Script {
    uint256 internal constant OG_MAINNET_CHAIN_ID = 16661;

    function run() external returns (OptimIEraRegistry registry) {
        require(block.chainid == OG_MAINNET_CHAIN_ID, "WRONG_MAINNET_CHAIN");
        uint256 deployerPrivateKey = vm.envUint("OPTIMIERA_DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address registrar = vm.envAddress("OPTIMIERA_REGISTRAR_ADDRESS");
        require(deployer != address(0) && registrar != address(0), "INVALID_DEPLOYMENT_ACCOUNT");

        vm.startBroadcast(deployerPrivateKey);
        registry = new OptimIEraRegistry(deployer, registrar);
        vm.stopBroadcast();
    }
}
