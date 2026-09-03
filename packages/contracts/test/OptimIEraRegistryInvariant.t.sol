// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {OptimIEraRegistry} from "../src/OptimIEraRegistry.sol";

contract RegistryInvariantHandler is Test {
    OptimIEraRegistry internal immutable registry;
    address internal immutable admin;
    address internal immutable registrar;
    bytes32[] internal proofIds;
    uint256 internal nonce;

    constructor(OptimIEraRegistry registry_, address admin_, address registrar_) {
        registry = registry_;
        admin = admin_;
        registrar = registrar_;
    }

    function register(bytes32 seed, uint16 score) external {
        score = uint16(bound(score, 0, 100));
        bytes32 optimizationId = keccak256(abi.encode("optimization", seed, nonce++));
        vm.prank(registrar);
        bytes32 id = registry.registerProof(
            optimizationId,
            keccak256(abi.encode("manifest", seed)),
            keccak256(abi.encode("storage", seed)),
            keccak256(abi.encode("original", seed)),
            keccak256(abi.encode("optimized", seed)),
            keccak256(abi.encode("evaluation", seed)),
            keccak256(abi.encode("owner", seed)),
            score
        );
        proofIds.push(id);
    }

    function revoke(uint256 index, bytes32 reason) external {
        if (proofIds.length == 0) return;
        bytes32 id = proofIds[index % proofIds.length];
        OptimIEraRegistry.OptimizationProof memory proof = registry.getProof(id);
        if (proof.status != OptimIEraRegistry.ProofStatus.VERIFIED) return;
        vm.prank(admin);
        registry.revokeProof(id, reason == bytes32(0) ? keccak256("reason") : reason);
    }

    function length() external view returns (uint256) {
        return proofIds.length;
    }

    function at(uint256 index) external view returns (bytes32) {
        return proofIds[index];
    }
}

contract OptimIEraRegistryInvariantTest is StdInvariant, Test {
    OptimIEraRegistry internal registry;
    RegistryInvariantHandler internal handler;
    address internal admin = address(0xA11CE);
    address internal registrar = address(0xB0B);

    function setUp() public {
        registry = new OptimIEraRegistry(admin, registrar);
        handler = new RegistryInvariantHandler(registry, admin, registrar);
        targetContract(address(handler));
    }

    function invariant_ProofIdentityNeverChanges() public view {
        uint256 count = handler.length();
        for (uint256 index; index < count; ++index) {
            bytes32 id = handler.at(index);
            OptimIEraRegistry.OptimizationProof memory proof = registry.getProof(id);
            assertEq(
                registry.proofId(
                    proof.optimizationId,
                    proof.manifestHash,
                    proof.storageRoot,
                    proof.originalPromptHash,
                    proof.optimizedPromptHash,
                    proof.evaluationHash,
                    proof.ownerRefHash,
                    proof.aggregateScore
                ),
                id
            );
            assertEq(proof.registrar, registrar);
            assertLe(proof.aggregateScore, 100);
            assertTrue(proof.status != OptimIEraRegistry.ProofStatus.NONE);
        }
    }

    function invariant_RevokedProofsNeverVerify() public view {
        uint256 count = handler.length();
        for (uint256 index; index < count; ++index) {
            bytes32 id = handler.at(index);
            OptimIEraRegistry.OptimizationProof memory proof = registry.getProof(id);
            if (proof.status != OptimIEraRegistry.ProofStatus.REVOKED) continue;
            (bool ok,) = address(registry).staticcall(
                abi.encodeCall(
                    registry.verifyProof,
                    (
                        id,
                        proof.manifestHash,
                        proof.storageRoot,
                        proof.originalPromptHash,
                        proof.optimizedPromptHash,
                        proof.evaluationHash,
                        proof.ownerRefHash,
                        proof.aggregateScore
                    )
                )
            );
            assertFalse(ok);
        }
    }

    function invariant_HandlerNeverGainsPrivilegedRoles() public view {
        assertFalse(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), address(handler)));
        assertFalse(registry.hasRole(registry.REGISTRAR_ROLE(), address(handler)));
    }
}
