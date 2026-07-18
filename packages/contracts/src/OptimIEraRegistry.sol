// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title OptimIEra Registry
/// @notice Stores hash-only optimization proof commitments.
contract OptimIEraRegistry is AccessControl, Pausable {
    bytes32 public constant REGISTRAR_ROLE = keccak256("OPTIMIERA_REGISTRAR_ROLE");

    enum ProofStatus {
        NONE,
        VERIFIED,
        REVOKED
    }

    struct OptimizationProof {
        bytes32 optimizationId;
        bytes32 manifestHash;
        bytes32 storageRoot;
        bytes32 originalPromptHash;
        bytes32 optimizedPromptHash;
        bytes32 evaluationHash;
        bytes32 ownerRefHash;
        address registrar;
        uint16 aggregateScore;
        uint64 createdAt;
        ProofStatus status;
    }

    mapping(bytes32 => OptimizationProof) private proofs;

    error DuplicateProof(bytes32 proofId);
    error ProofNotFound(bytes32 proofId);
    error InvalidHash();
    error InvalidScore();
    error InvalidStatus();
    error InvalidReason();

    event ProofRegistered(
        bytes32 indexed proofId, bytes32 indexed optimizationId, address indexed registrar, bytes32 manifestHash
    );
    event ProofRevoked(bytes32 indexed proofId, bytes32 reasonHash);

    constructor(address admin, address registrar) {
        if (admin == address(0) || registrar == address(0)) revert InvalidHash();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, registrar);
    }

    function proofId(
        bytes32 optimizationId,
        bytes32 manifestHash,
        bytes32 storageRoot,
        bytes32 originalPromptHash,
        bytes32 optimizedPromptHash,
        bytes32 evaluationHash,
        bytes32 ownerRefHash,
        uint16 aggregateScore
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                "OptimIEra:OptimizationProof:V1",
                optimizationId,
                manifestHash,
                storageRoot,
                originalPromptHash,
                optimizedPromptHash,
                evaluationHash,
                ownerRefHash,
                aggregateScore
            )
        );
    }

    function registerProof(
        bytes32 optimizationId,
        bytes32 manifestHash,
        bytes32 storageRoot,
        bytes32 originalPromptHash,
        bytes32 optimizedPromptHash,
        bytes32 evaluationHash,
        bytes32 ownerRefHash,
        uint16 aggregateScore
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused returns (bytes32 id) {
        if (
            manifestHash == bytes32(0) || optimizationId == bytes32(0) || originalPromptHash == bytes32(0)
                || optimizedPromptHash == bytes32(0) || evaluationHash == bytes32(0) || ownerRefHash == bytes32(0)
        ) revert InvalidHash();
        if (aggregateScore > 100) revert InvalidScore();
        id = proofId(
            optimizationId,
            manifestHash,
            storageRoot,
            originalPromptHash,
            optimizedPromptHash,
            evaluationHash,
            ownerRefHash,
            aggregateScore
        );
        if (proofs[id].status != ProofStatus.NONE) revert DuplicateProof(id);
        proofs[id] = OptimizationProof(
            optimizationId,
            manifestHash,
            storageRoot,
            originalPromptHash,
            optimizedPromptHash,
            evaluationHash,
            ownerRefHash,
            msg.sender,
            aggregateScore,
            uint64(block.timestamp),
            ProofStatus.VERIFIED
        );
        emit ProofRegistered(id, optimizationId, msg.sender, manifestHash);
    }

    function getProof(bytes32 id) external view returns (OptimizationProof memory) {
        if (proofs[id].status == ProofStatus.NONE) revert ProofNotFound(id);
        return proofs[id];
    }

    function verifyProof(
        bytes32 id,
        bytes32 manifestHash,
        bytes32 storageRoot,
        bytes32 originalPromptHash,
        bytes32 optimizedPromptHash,
        bytes32 evaluationHash,
        bytes32 ownerRefHash,
        uint16 aggregateScore
    ) external view returns (bool) {
        OptimizationProof memory proof = proofs[id];
        if (proof.status == ProofStatus.NONE) revert ProofNotFound(id);
        if (proof.status == ProofStatus.REVOKED) revert InvalidStatus();
        return proof.manifestHash == manifestHash && proof.storageRoot == storageRoot
            && proof.originalPromptHash == originalPromptHash && proof.optimizedPromptHash == optimizedPromptHash
            && proof.evaluationHash == evaluationHash && proof.ownerRefHash == ownerRefHash
            && proof.aggregateScore == aggregateScore;
    }

    function revokeProof(bytes32 id, bytes32 reasonHash) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        if (reasonHash == bytes32(0)) revert InvalidReason();
        if (proofs[id].status == ProofStatus.NONE) revert ProofNotFound(id);
        if (proofs[id].status == ProofStatus.REVOKED) revert InvalidStatus();
        proofs[id].status = ProofStatus.REVOKED;
        emit ProofRevoked(id, reasonHash);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
