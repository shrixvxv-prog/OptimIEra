# Live 0G Evidence

Status as of 2026-07-18: `COMPLETE`. This report records the activation
boundary and current evidence state, including the real Galileo Storage upload
and registry deployment evidence captured during recovery.

## Phase 8D completion — 2026-07-18

- Compute: authenticated Router model `qwen2.5-omni` returned a valid compact structured response with the exact three candidates `BALANCED`, `ACCURACY_FOCUSED`, and `TOKEN_EFFICIENT`. Request ID `cdb34928-eb85-9ef7-bdab-6eb68a38f0ae`, response ID `chatcmpl-95ae7584-5d2e-4d67-bdac-8bdce44c3574`, latency 2478 ms, zero retries. The selected immutable PromptVersion was `cmrqhd8jo0000t8v9np78f9rg`; no prompt plaintext or API key is recorded here.
- Evidence: artifact `cmrqhfbeg00001wv9chg6goap`, content hash `8d72ff61af909ad269706e45b801c657b020efae816e888285444cb178291d49`, byte size 5557, new root `0x05ed3344b48d8ed4b1135ce4d7c8c281af38d17bb431c9a24f523d48180d7519`, and transaction `0x5a46149095145897f9a2e6df3cd60dff479f642081f9ed013dda37bb071bf850`. SDK proof-enabled download returned the exact bytes; the existing transaction sequence was resumed and no second evidence transaction was submitted.
- Chain: proof ID `0x4d57bf123b8647e0eaa856551e69cb6191ae63baabfdfedcb089011218591724`, transaction `0x2b184562ae611fe11e79906d723cfa726ffd52a0edfde657ed9078ade095643b`, block `44693862`, registry `0xda91a3929107c74f27e2d3288d046e4a37f9b422`; contract readback matched the committed manifest hash and Storage root.
- Certificate: `cert_1343d8825f8905d881361fa39d7e2a1e`, public slug `optimiera-1343d8825f8905d88136`, verification level `FULLY_VERIFIED`, model `qwen2.5-omni`. Public URL: `/verify/cert_1343d8825f8905d881361fa39d7e2a1e`.

## Phase 8 activation attempt — 2026-07-18

The Galileo preflight was run with local environment loading enabled. Mainnet
was not selected. Independent evidence capture was attempted; the all-
components activation was not run because Compute and Storage did not complete
successfully.

- Compute: model `qwen2.5-omni` was found in the testnet catalog. The original request returned HTTP `400` because Galileo rejected `max_tokens` above 2048; request ID `b1161247-0b2a-9dff-ac2b-246c57576e79`. The adapter now clamps output tokens to 2048. A later minimal authenticated diagnostic succeeded with request ID `f4829f82-f269-94bf-a36e-f61c16d8fb1a`, but the structured adapter inference failed schema validation after the bounded repair attempt; no product-level live verification is claimed.
- Storage: the encrypted diagnostic upload returned root `0x41721ed609709ee779a2420d793741b42c2135f0e4ed308699192267c0a055ba` and transaction `0x70b72c76b48fed9c3cb675c1e269a82a0aeec0f479b62ca4a394afb229fe8767`. The receipt succeeded, the root has four indexed replicas, and SDK proof-enabled download returned 252 bytes. Application verification failed because this diagnostic payload is not a valid `OptimizationEvidenceManifestV1`; no new upload was made.
- Chain: one Galileo registry deployment succeeded at `0xda91a3929107c74f27e2d3288d046e4a37f9b422`, transaction `0xfbba492dbbe55d0345e06286374c835e405486cebe70f82883deab2f4821383d`, receipt block `0x2a9daad`. The registrar role read back `true` for `0xf58b0ADBE671AE7d5B224600700eB4d4A0105c46`.
- Contract source verification: submitted to ChainScan with GUID `6623ec23-c8e4-48f7-99a4-1988e2368ed6`; status remains `PENDING` because the verifier status endpoint did not accept the returned GUID format. Contract link: [ChainScan Galileo](https://chainscan-galileo.0g.ai/address/0xda91a3929107c74f27e2d3288d046e4a37f9b422).
- Chain proof: not registered because the existing Storage object is diagnostic data rather than a verified optimization evidence manifest; no duplicate proof was submitted.
- Certificate: no live certificate was issued; existing local/test-adapter certificates retain their existing trust classifications.

The failed Compute request and failed Storage upload are recorded as recovery
evidence only. The registry deployment and role readback are real public chain
evidence; no proof or certificate is claimed from them alone.

## Unified preflight

Run `pnpm og:live:check`. It is static and secret-safe: `liveCallsMade` must
remain `false`. Run `pnpm og:live:activate` for the same preflight. The
activation command requires `--confirm-testnet` and refuses to proceed unless
all required testnet credentials and addresses are present.

Current live status:

- Compute: `FAILED` after configured inference/schema validation.
- Storage: `AVAILABLE` for the existing object; no manifest upload claim.
- Chain: `AVAILABLE` with the deployed registry and readable contract.

## Phase 7B verification closure

The local development database `optimiera` and isolated test database
`optimiera_test` are healthy. All six existing migrations are applied to both
databases. The complete Vitest suite passes 84/84 tests. The enabled Chromium
Playwright suite passes twice from clean test resets: 12 passed and one
intentional unconfigured-storage test skipped per run. Foundry, formatting,
lint, typecheck, docs/API/web/full builds, safety, and banned-name scans pass.

Later manual activation remains gated by:

```powershell
pnpm og:live:activate -- --confirm-testnet
```

That command must not be run until all listed credentials, a deployed registry,
and funded testnet signers are configured.

## Allowed network

Phase 7 permits only 0G Galileo testnet, chain ID `16602`. Mainnet settings,
mainnet RPC hosts, and other chain IDs are blocked. Official references:
[0G testnet overview](https://docs.0g.ai/developer-hub/testnet/testnet-overview),
[ChainScan Galileo](https://chainscan-galileo.0g.ai), and
[StorageScan Galileo](https://storagescan-galileo.0g.ai).

## Evidence required for `LIVE_VERIFIED`

The final report must contain real authenticated evidence for all three
components: Router request/model/usage metadata; Storage root, transaction,
and readback comparison; and registry address, transaction, block, event,
readback, and explorer links. No placeholder hashes, addresses, or fabricated
links are valid.

## Current proof boundary

Rules Engine remains local deterministic. Existing local and test-adapter
certificate coverage is not live 0G evidence. No activation, upload,
transaction, deployment, or verification was executed while credentials were
absent.
