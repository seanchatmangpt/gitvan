# GitVan Security Policy

GitVan executes commands, network requests, and filesystem operations. Treat workflow definitions as executable policy and review changes to them with the same rigor as source code.

## Supported production profile

The Fortune-5 hardening profile is defined in [`docs/enterprise/FORTUNE5_READINESS.md`](docs/enterprise/FORTUNE5_READINESS.md). It is an engineering control profile, not a claim of SOC 2, ISO 27001, FedRAMP, PCI DSS, or customer-specific certification.

For the hardened workflow path, GitVan uses a deny-by-default actuation broker:

- actor and tenant identity are required before enterprise actuation;
- CLI authority is granted to exact command vectors rather than shell strings;
- child-process environments are filtered instead of inheriting ambient credentials;
- HTTP destinations, methods, schemes, and redirects are bounded by policy;
- filesystem operations are fenced to an admitted repository root and checked against traversal/symlink escape;
- admission, refusal, execution, and failure produce digest-bound receipts suitable for replay verification.

The broker governs the enterprise workflow path. It does **not** imply that every historical helper, example, or third-party integration in this repository has the same authority model. Enterprise deployments should use the documented enterprise entrypoints and keep the `Enterprise Readiness` gate required on protected branches.

## Dependency and build security

The canonical package manager is the `packageManager` version declared in `package.json`; the supported production Node baseline is declared in `engines.node`. `pnpm-workspace.yaml` applies dependency-build admission policy and transitive overrides. CI installs the lockfile frozen, runs the enterprise contract, full regression suite, build, production audit, dependency inventory, and packaged-artifact smoke test.

Do not bypass a frozen-lock failure by changing CI to an unfrozen production install. Regenerate the lock intentionally, review the dependency delta, and commit the resulting package/lock identity together.

GitHub Actions used by the Fortune-5 gates are pinned to commit SHAs. Changes to workflow action identities, package-manager versions, dependency lifecycle permissions, or audit thresholds are security-sensitive changes.

## Secrets

Do not place credentials in workflow definitions, Turtle/RDF data, generated receipts, examples, logs, or committed environment files. The enterprise broker filters ambient process variables, but upstream orchestration is still responsible for least-privilege secret injection, rotation, and revocation.

Customer identity systems, SSO/SCIM, centralized KMS/HSM custody, SIEM retention, network segmentation, workload identity, and organization-wide policy distribution are deployment-platform responsibilities unless explicitly implemented and verified in a future GitVan control plane.

## Vulnerability reporting

Do **not** disclose suspected vulnerabilities in a public issue. Use GitHub's private vulnerability reporting / Security Advisory flow for this repository when available. If that UI is unavailable, contact the repository owner through a private contact channel published on the owner's GitHub profile and include reproduction steps, affected commit/version, impact, and any proposed mitigation.

## Release gate

A production release is not admitted solely because source review looks correct. Minimum evidence is:

1. exact source commit identity;
2. frozen dependency installation against the committed pnpm lock;
3. enterprise actuation contract on supported Node versions;
4. repository regression suite and build;
5. high-severity production dependency audit;
6. packaged-artifact consumer smoke test;
7. receipts or CI records bound to the exact subject.

A failed, skipped, queued, or unrelated workflow is not a successful release receipt.

Last updated: 2026-08-12.
