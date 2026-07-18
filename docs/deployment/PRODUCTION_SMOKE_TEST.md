# Production smoke test

1. Open `/api/health` and confirm `ok`.
2. Open `/api/readiness` and confirm database, auth, and encryption are `ready` without any secret values in the response.
3. Open `/api/version` and confirm the Wave 2 release marker.
4. Sign up or sign in, create a workspace, and run a Rules Engine optimization.
5. Confirm the Optimize page labels Rules Engine as local deterministic and leaves unconfigured 0G providers disabled.
6. Open a public certificate only after its database record exists; verify that no prompt text or API key is displayed.
7. Confirm demo mode is enabled and live writes are disabled.
