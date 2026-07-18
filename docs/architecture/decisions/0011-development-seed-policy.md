# ADR 0011: Development-only seed policy

Status: accepted. `SEED_DEVELOPMENT_DATA=true` is required and production refuses seed fixtures. Visible fixture names include Development, and no blockchain or external execution proof is created. Local plaintext prompt storage is labeled `PLAINTEXT_LOCAL_ONLY` and must not be enabled for production.
