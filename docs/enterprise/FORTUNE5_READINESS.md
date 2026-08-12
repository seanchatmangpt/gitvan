# GitVan Fortune-5 Enterprise Runtime Profile

This document defines the bounded runtime profile GitVan must satisfy before it is presented as production-ready for a Fortune-5 environment. It is an engineering control contract, not a claim of SOC 2, FedRAMP, ISO 27001, PCI DSS, or any other external certification.

## Standing model

GitVan distinguishes observation from authority and execution:

`parse -> route -> admit/refuse -> execute -> receipt -> replay`

For workflow actuation in enterprise mode, `cli`, `http`, and `file` steps must pass the enterprise actuation broker before a handler can cause external consequence. A refusal is a successful safety outcome and is returned with a typed refusal code.

Enterprise mode is enabled with:

```bash
export GITVAN_ENTERPRISE_MODE=1
export GITVAN_ACTOR='svc:gitvan-prod'
export GITVAN_TENANT='customer-or-business-unit-id'
export GITVAN_REPO="$PWD"
```

## Authority policy

### CLI

CLI authority is exact-command authority, not executable-only authority. The executable must be an absolute path and the complete argument vector must match an admitted vector. Dynamic command or argument templates are refused.

Programmatic configuration is preferred:

```js
const enterprisePolicy = {
  enabled: true,
  rootDir: process.cwd(),
  actor: 'svc:gitvan-prod',
  tenant: 'finance-platform',
  cli: {
    allowedCommands: [
      [process.execPath, '--version'],
      ['/usr/bin/git', 'status', '--porcelain=v1'],
    ],
    allowedEnv: ['NODE_ENV'],
  },
};
```

For process-level configuration, `GITVAN_ALLOWED_COMMANDS_JSON` accepts a JSON array of exact command vectors. `GITVAN_ALLOWED_ENV` is a comma-separated list of explicit environment keys.

The child process does not inherit the full GitVan process environment in enterprise mode. Only the broker's admitted environment crosses the boundary.

### HTTP

HTTP authority is scheme + hostname + method authority. Enterprise mode:

- requires HTTPS unless HTTP is explicitly admitted for a controlled environment;
- rejects credentials embedded in URLs;
- rejects dynamic destination templates;
- requires exact hostname admission;
- requires method admission; and
- does not automatically follow redirects, because a redirect names a second destination that has not been admitted.

Configuration keys are `GITVAN_ALLOWED_HTTP_HOSTS`, `GITVAN_ALLOWED_HTTP_METHODS`, and (only where required) `GITVAN_ALLOW_HTTP=1`.

### Filesystem

Filesystem authority is rooted under `GITVAN_REPO` (or `enterprisePolicy.rootDir`). Read/write/copy/move/delete paths are normalized and checked for lexical and existing-symlink escape. Dynamic target-path templates are refused. Operations are deny-by-default except `read`; additional operations must be admitted with `GITVAN_ALLOWED_FILE_OPERATIONS` or the programmatic policy.

## Receipts

Enterprise admission manufactures a SHA-256-bound receipt before actuation and persists it under:

`.gitvan/receipts/enterprise/<digest>.json`

The directory is already under GitVan's ignored runtime state. Execution manufactures a second receipt whose `parentDigest` binds it to the admission receipt. Receipt payloads avoid raw HTTP query strings, HTTP bodies, header values, file contents, and CLI argument values; sensitive values are represented by metadata or digests.

If admission receipt persistence fails, enterprise execution fails closed. An admission receipt without a corresponding execution receipt is therefore evidence of an interrupted or crashed execution path that requires reconciliation rather than silent success.

## Verification

The minimum local contract is:

```bash
node --test tests/enterprise/actuation-broker.test.mjs
node scripts/verify-enterprise-readiness.mjs
```

The GitHub `Enterprise Readiness` workflow expands this to Node 22 and Node 24 syntax/contract verification plus locked dependency installation, focused integration tests, lint, the full test suite, build, production dependency audit, SBOM manufacture, and package dry-run.

## Explicit non-claims and remaining customer controls

This profile hardens GitVan's repo-local workflow execution boundary. It does not manufacture enterprise identity systems that belong outside a repo-local CLI, such as SAML/OIDC SSO, SCIM, workforce lifecycle management, centralized KMS/HSM custody, SIEM retention, network segmentation, or organization-wide policy distribution. Those controls must be supplied by the customer's execution platform or a future GitVan control plane.

A Fortune-5 production deployment should not be called `ALIVE` solely because unit tests pass. Standing requires the exact candidate SHA to pass the enterprise workflow, plus a customer-shaped clean-room execution using the intended identity, filesystem root, network allowlist, command policy, secret source, and deployment substrate.
