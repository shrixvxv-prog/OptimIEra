# 0G data flow

Current certificate flow:

`completed optimization -> saved immutable PromptVersion -> encrypted evidence -> local or verified Storage proof -> local or verified ChainProof -> immutable certificate -> public-safe verification`

Certificate issuance publishes only hashes and safe metadata. Plaintext prompts and encrypted envelopes remain private. Live Storage and Chain verification are never inferred from configuration alone.
