# Verify a certificate

Open `/verify/<public-slug>` without authentication. The page recalculates the canonical certificate hash, checks immutable PromptVersion hashes, compares the evidence manifest and available ChainProof, and shows individual checks. JSON downloads are public-safe and contain no prompt plaintext or encrypted envelopes.
