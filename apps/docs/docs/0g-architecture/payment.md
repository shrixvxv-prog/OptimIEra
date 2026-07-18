# Payment and usage-metering architecture

Purpose: one-time usage accounting on 0G Galileo. Status: **IMPLEMENTED AND MOCK-VERIFIED**; no live payment is claimed.

When `OPTIMIERA_USAGE_PAYMENTS_ENABLED=true`, every optimization requires a native 0G transfer of at least `100000000000000` wei (0.0001 0G) on chain `16602`. The server verifies the transaction receipt, chain, recipient, amount, successful execution, and that the payer belongs to the signed-in user. A transaction hash and an idempotency key can each be consumed only once. Private keys are never sent to the browser, and the server never initiates or signs the user's transfer.

The existing OptimIEra Registry contract records proof hashes; usage payment is a native transfer and does not require a new payment contract. Live payment remains unverified until a user explicitly approves a funded Galileo transaction.
