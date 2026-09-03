# Vercel environment matrix

| Variable                                                               | Production                       | Preview                          | Development             | Secret                   |
| ---------------------------------------------------------------------- | -------------------------------- | -------------------------------- | ----------------------- | ------------------------ |
| `DATABASE_URL`, `DIRECT_URL`                                           | Required managed PostgreSQL URLs | Required isolated preview DB     | Local Docker PostgreSQL | Yes                      |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` | Required                         | Required                         | Local values            | Secret except public URL |
| `PROMPT_STORAGE_MODE`                                                  | `ENCRYPTED`                      | `ENCRYPTED`                      | `ENCRYPTED`             | No                       |
| `OPTIMIERA_ENCRYPTION_MASTER_KEY`                                      | Required 32-byte base64 key      | Distinct required key            | Local key               | Yes                      |
| `OPTIMIERA_DEMO_MODE`                                                  | `true`                           | `true`                           | `true`                  | No                       |
| `OPTIMIERA_LIVE_WRITES_ENABLED`                                        | Unset; public default is `true`  | Unset; public default is `true`  | `false`                 | No                       |
| `OPTIMIERA_PUBLIC_LIVE_0G_ENABLED`                                     | Unset; public default is `true`  | Unset; public default is `true`  | `false`                 | No                       |
| `OPTIMIERA_0G_MAINNET_ENABLED`                                         | `true` for Aristotle rollout     | `true` for Aristotle Preview     | `false`                 | No                       |
| `OPTIMIERA_USER_DAILY_COMPUTE_LIMIT`                                   | `3`                              | `3`                              | `3`                     | No                       |
| `OPTIMIERA_USER_DAILY_STORAGE_LIMIT`                                   | `2`                              | `2`                              | `2`                     | No                       |
| `OPTIMIERA_USER_DAILY_CHAIN_LIMIT`                                     | `2`                              | `2`                              | `2`                     | No                       |
| `OPTIMIERA_GLOBAL_DAILY_COMPUTE_LIMIT`                                 | `50`                             | `20`                             | `50`                    | No                       |
| `OPTIMIERA_GLOBAL_DAILY_STORAGE_LIMIT`                                 | `20`                             | `10`                             | `20`                    | No                       |
| `OPTIMIERA_GLOBAL_DAILY_CHAIN_LIMIT`                                   | `20`                             | `10`                             | `20`                    | No                       |
| 0G private keys/API keys                                               | Required for public live profile | Required for public live profile | Optional local only     | Yes                      |
| `NOUS_ENABLED`, `NOUS_MODEL`, `NOUS_TIMEOUT_MS`                        | Optional                         | Optional                         | Optional                | No                       |
| `NOUS_API_KEY`                                                         | Required for Nous provider       | Use a separate preview key       | Optional local key      | Yes                      |
| `OPTIMIERA_USAGE_PAYMENTS_ENABLED`                                     | Explicit `true` or `false`       | Prefer `false`                   | Explicit                | No                       |
| `OG_USAGE_PAYMENT_CHAIN_ID`, `OG_USAGE_PAYMENT_AMOUNT_WEI`             | `16661`, `100000000000000`       | Same when enabled                | Same when enabled       | No                       |
| `OG_USAGE_PAYMENT_RPC_URL`, `OG_USAGE_PAYMENT_RECIPIENT`               | Required when payments enabled   | Required when enabled            | Optional local values   | Recipient/RPC are public |

Never set `NEXT_PUBLIC_` on database URLs, auth secrets, encryption keys, or 0G keys.

Preview and Production must use distinct managed databases and encryption keys. For Aristotle, set `OPTIMIERA_0G_MAINNET_ENABLED=true`, all three `OG_*_NETWORK` variables to `mainnet`, and Chain ID to `16661`. The required public endpoints are Compute `https://router-api.0g.ai/v1`, RPC `https://evmrpc.0g.ai`, Storage indexer `https://indexer-storage-turbo.0g.ai`, and ChainScan `https://chainscan.0g.ai`. Production rejects mismatched networks, test adapters, and mainnet without the explicit flag. Public Vercel environments default to bounded live writes when the required server-side credentials are configured; set either live-write variable to `false` to disable them. `LIVE_EVIDENCE_OWNER_EMAIL` is an optional protected one-time operational value and should be removed after restoration.
