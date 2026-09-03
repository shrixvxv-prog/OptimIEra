# OptimIEra Prompt CI/CD

OptimIEra's core validation command is local-first and does not require GitHub-specific services or live 0G writes:

```bash
pnpm optimiera test optimiera.config.json
pnpm optimiera test optimiera.config.json --json > optimiera-report.json
```

The command loads a JSON-only project configuration, reads prompt files and a benchmark suite, runs the deterministic analyzer, executes the selected provider, and—when `baseline` and `regressionPolicy` are configured—produces a PASS, WARNING, or BLOCKED regression result. Prompt text and provider output are never printed in the human or JSON summary.

## Configuration

Use `optimiera.config.json` in the project root. JSON is intentional: executable JavaScript/TypeScript configuration is rejected so untrusted pull requests cannot run arbitrary config code.

```json
{
  "prompts": [
    { "id": "baseline", "file": "prompts/approved.txt" },
    { "id": "candidate", "file": "prompts/proposed.txt" }
  ],
  "benchmarkSuite": "benchmarks/support.json",
  "baseline": "baseline",
  "provider": "local",
  "regressionPolicy": {
    "minimumSuccessScore": 0.8,
    "maximumRegressionPercentage": 0.05,
    "maximumSafetyFailures": 0,
    "maximumPrivacyFailures": 0,
    "severities": {
      "minimumSuccessScore": "BLOCKING",
      "maximumRegressionPercentage": "BLOCKING"
    }
  },
  "evidence": { "includeRegressionHash": true }
}
```

`provider` may be `local` or `og-compute`. Provider credentials are environment variables only and are rejected if placed in the config. Ordinary pull-request validation should use `local`; selecting `og-compute` requires the existing server-side 0G Compute configuration and returns exit code 2 when it is unavailable.

## Exit codes and reports

- `0`: validation passed; warnings are reported but are not blocking.
- `1`: benchmark failure or blocking regression.
- `2`: invalid configuration, unsafe path, unavailable provider configuration, or runtime failure.

The JSON reporter includes safe analyzer summaries, benchmark metrics, suite hash, and regression policy results. It omits prompt contents and model outputs.

## GitHub workflow template

Copy [optimiera-prompt-ci.yml](./optimiera-prompt-ci.yml) into a repository's workflow directory and commit a project-local `optimiera.config.json`. The workflow uses only read-only checkout/install/test behavior and uploads the safe JSON result as an artifact. It does not expose secrets to fork pull requests and does not publish to 0G.

## Release mode

`test` never writes to 0G. `verify` and `publish` are reserved explicit release commands and currently refuse to run from the CI validation path. Any future release integration must require a trusted release environment, explicit operator approval, and server-side credentials; it must never be invoked automatically by a pull request.

## Security rules

- Only JSON config is accepted; no config execution or shell interpolation occurs.
- Prompt and suite paths must resolve inside the config project root, including symlink resolution.
- Secret-shaped config keys are rejected.
- The CLI never prints provider credentials, prompt contents, or model output.
- The CLI invokes no user-provided commands.
