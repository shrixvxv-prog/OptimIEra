// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {OptimIEraRegistry} from "../src/OptimIEraRegistry.sol";

contract OptimIEraRegistryTest is Test {
    OptimIEraRegistry registry;
    address admin = address(1);
    address registrar = address(2);
    bytes32 constant ID = keccak256("optimization");
    bytes32 constant MANIFEST = keccak256("manifest");
    bytes32 constant ORIGINAL = keccak256("original");
    bytes32 constant OPTIMIZED = keccak256("optimized");
    bytes32 constant EVALUATION = keccak256("evaluation");
    bytes32 constant OWNER = keccak256("owner");

    function setUp() public {
        registry = new OptimIEraRegistry(admin, registrar);
    }

    function testRegisterReadVerifyAndDuplicate() public {
        vm.prank(registrar);
        bytes32 id = registry.registerProof(ID, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 90);
        OptimIEraRegistry.OptimizationProof memory proof = registry.getProof(id);
        assertEq(proof.manifestHash, MANIFEST);
        assertTrue(registry.verifyProof(id, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 90));
        vm.prank(registrar);
        vm.expectRevert(abi.encodeWithSelector(OptimIEraRegistry.DuplicateProof.selector, id));
        registry.registerProof(ID, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 90);
    }

    function testPauseAndRevoke() public {
        vm.prank(admin);
        registry.pause();
        vm.prank(registrar);
        vm.expectRevert();
        registry.registerProof(ID, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 90);
        vm.prank(admin);
        registry.unpause();
        vm.prank(registrar);
        bytes32 id = registry.registerProof(ID, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 90);
        vm.prank(admin);
        registry.revokeProof(id, keccak256("reason"));
        vm.expectRevert();
        registry.verifyProof(id, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 90);
    }

    function testUnauthorizedRegistrationAndInvalidInputs() public {
        vm.expectRevert();
        registry.registerProof(ID, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 90);
        vm.prank(registrar);
        vm.expectRevert(OptimIEraRegistry.InvalidScore.selector);
        registry.registerProof(ID, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 101);
        vm.prank(registrar);
        vm.expectRevert(OptimIEraRegistry.InvalidHash.selector);
        registry.registerProof(ID, bytes32(0), bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 90);
    }

    function testAdminRoleAndEventValues() public {
        bytes32 id = registry.proofId(ID, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 90);
        vm.expectEmit(true, true, true, true);
        emit OptimIEraRegistry.ProofRegistered(id, ID, registrar, MANIFEST);
        vm.prank(registrar);
        registry.registerProof(ID, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, 90);
        vm.prank(address(3));
        vm.expectRevert();
        registry.revokeProof(id, keccak256("reason"));
    }

    function testFuzzValidScores(uint16 score) public {
        score = uint16(bound(score, 0, 100));
        vm.prank(registrar);
        bytes32 id = registry.registerProof(
            keccak256(abi.encode(score)), MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, score
        );
        assertTrue(registry.verifyProof(id, MANIFEST, bytes32(0), ORIGINAL, OPTIMIZED, EVALUATION, OWNER, score));
    }
}
