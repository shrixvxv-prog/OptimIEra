# Vercel environment matrix

| Variable                                                               | Production                       | Preview                      | Development             | Secret                   |
| ---------------------------------------------------------------------- | -------------------------------- | ---------------------------- | ----------------------- | ------------------------ |
| `DATABASE_URL`, `DIRECT_URL`                                           | Required managed PostgreSQL URLs | Required isolated preview DB | Local Docker PostgreSQL | Yes                      |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` | Required                         | Required                     | Local values            | Secret except public URL |
| `PROMPT_STORAGE_MODE`                                                  | `ENCRYPTED`                      | `ENCRYPTED`                  | `ENCRYPTED`             | No                       |
| `OPTIMIERA_ENCRYPTION_MASTER_KEY`                                      | Required 32-byte base64 key      | Distinct required key        | Local key               | Yes                      |
| `OPTIMIERA_DEMO_MODE`                                                  | `true`                           | `true`                       | `true`                  | No                       |
| `OPTIMIERA_LIVE_WRITES_ENABLED`                                        | `false`                          | `false`                      | `false`                 | No                       |
| 0G private keys/API keys                                               | Omit for Wave 2                  | Omit                         | Optional local only     | Yes                      |
| `NOUS_ENABLED`, `NOUS_MODEL`, `NOUS_TIMEOUT_MS`                        | Optional                         | Optional                     | Optional                | No                       |
| `NOUS_API_KEY`                                                         | Required for Nous provider       | Use a separate preview key   | Optional local key      | Yes                      |
| `OPTIMIERA_USAGE_PAYMENTS_ENABLED`                                     | Explicit `true` or `false`       | Prefer `false`               | Explicit                | No                       |
| `OG_USAGE_PAYMENT_CHAIN_ID`, `OG_USAGE_PAYMENT_AMOUNT_WEI`             | `16602`, `100000000000000`       | Same when enabled            | Same when enabled       | No                       |
| `OG_USAGE_PAYMENT_RPC_URL`, `OG_USAGE_PAYMENT_RECIPIENT`               | Required when payments enabled   | Required when enabled        | Optional local values   | Recipient/RPC are public |

Never set `NEXT_PUBLIC_` on database URLs, auth secrets, encryption keys, or 0G keys.
