# Live evidence restoration

`pnpm live:evidence:restore -- --owner-email=<existing-production-user-email>` performs a read-only dry run. It downloads the existing Galileo manifest, verifies its known hash/root/size, reads the existing registry proof and receipt, and makes no database or external write.

After the dry run succeeds, restore the verified database records only with:

```sh
pnpm live:evidence:restore -- --confirm-production --owner-email=<existing-production-user-email>
```

The command requires `NODE_ENV=production`, a TLS-enabled non-local managed `DATABASE_URL`, an existing owner account, and public 0G Storage/Chain read configuration. It validates the known bytes, hashes, proof tuple, registry bytecode, successful receipt, block, and immutable prompt-version identifier. It never uploads evidence, sends a chain transaction, or creates a new certificate on 0G.
