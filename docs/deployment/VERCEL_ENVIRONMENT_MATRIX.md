# Vercel environment matrix

| Variable | Production | Preview | Development | Secret |
| --- | --- | --- | --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | Required managed PostgreSQL URLs | Required isolated preview DB | Local Docker PostgreSQL | Yes |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` | Required | Required | Local values | Secret except public URL |
| `PROMPT_STORAGE_MODE` | `ENCRYPTED` | `ENCRYPTED` | `ENCRYPTED` | No |
| `OPTIMIERA_ENCRYPTION_MASTER_KEY` | Required 32-byte base64 key | Distinct required key | Local key | Yes |
| `OPTIMIERA_DEMO_MODE` | `true` | `true` | `true` | No |
| `OPTIMIERA_LIVE_WRITES_ENABLED` | `false` | `false` | `false` | No |
| 0G private keys/API keys | Omit for Wave 2 | Omit | Optional local only | Yes |

Never set `NEXT_PUBLIC_` on database URLs, auth secrets, encryption keys, or 0G keys.
