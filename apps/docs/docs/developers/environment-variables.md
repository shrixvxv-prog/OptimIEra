# Environment variables

Variable names are documented in the repository `.env.example` and the reference page.

Core local development requires database and auth settings plus `OPTIMIERA_ENCRYPTION_MASTER_KEY` for encrypted prompt and candidate storage.

Optional prompt-intelligence settings are `NOUS_ENABLED`, `NOUS_BASE_URL`, `NOUS_API_KEY`, `NOUS_MODEL`, and `NOUS_TIMEOUT_MS`. Usage-payment settings are `OPTIMIERA_USAGE_PAYMENTS_ENABLED`, `OG_USAGE_PAYMENT_CHAIN_ID`, `OG_USAGE_PAYMENT_RPC_URL`, `OG_USAGE_PAYMENT_RECIPIENT`, and `OG_USAGE_PAYMENT_AMOUNT_WEI`. API keys, database URLs, encryption keys, and private keys must remain server-only and must never use a `NEXT_PUBLIC_` prefix.
