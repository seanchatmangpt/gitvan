# GitVan v2 Validation Framework

## Overview

This directory contains comprehensive validation frameworks for GitVan v2 that ensure all specifications are testable, measurable, and verifiable. The validation framework provides multiple layers of verification to guarantee system quality and compliance.

## Validation Artifacts

### 📋 [acceptance-tests.md](./acceptance-tests.md)
Comprehensive acceptance test scenarios covering all major features:
- **Job Definition and Execution**: Basic job creation, composables usage, timeout handling
- **Event-Driven Execution**: Filesystem routing, cron scheduling, pattern matching
- **Composables API**: Git operations, template rendering, multi-format execution
- **Worktree Support**: Multi-worktree execution, scoping, shared resources
- **Lock System**: Once-only execution, cleanup, collision resolution
- **Receipt System**: Complete receipt data, artifact tracking, error handling
- **Security Validation**: Signed commits, command restrictions, separation of duties
- **Performance Validation**: Local execution speed, large repositories, concurrency
- **Integration Validation**: Git hooks, CI/CD pipelines, multi-repository coordination

### 🎯 [compliance-matrix.md](./compliance-matrix.md)
Requirements traceability matrix with 79 tracked requirements:
- **Complete**: 56 (71%) - All critical and most high-priority requirements
- **Pending**: 23 (29%) - Primarily medium and low-priority items
- **Critical Priority**: 15 (100% Complete)
- **Coverage Categories**: Architecture, Jobs, Events, Composables, Locks, Receipts, Worktrees, Configuration, CLI, Security, Performance, Integration

### ⚠️ [risk-assessment.md](./risk-assessment.md)
Comprehensive risk framework with mitigation strategies:
- **Technical Risks**: Repository corruption, race conditions, context corruption, performance degradation
- **Security Risks**: Unauthorized execution, signature bypass, information disclosure
- **Operational Risks**: Daemon failures, configuration drift, dependency vulnerabilities
- **Data Risks**: Repository growth, consistency issues
- **Integration Risks**: Git hook conflicts, CI/CD interference
- **Risk Levels**: Critical (immediate action), High (30 days), Medium (monitor), Low (accept)

### ⚡ [performance-criteria.md](./performance-criteria.md)
Performance targets and benchmarking framework:
- **Primary Metrics**: TTFW <10min, p95 ≤300ms, p99 ≤800ms, daemon startup ≤5s
- **Test Categories**: Micro-benchmarks, integration benchmarks, load testing, stress testing
- **Monitoring**: Continuous performance regression detection, dashboard, optimization guidelines
- **Environments**: Development (MacBook Pro M2), CI (GitHub Actions), Production-like (AWS EC2)

### 🔧 [integration-tests.md](./integration-tests.md)
Real-world integration test scenarios:
- **Git Integration**: Core operations, signed commits, worktree operations
- **CI/CD Platforms**: GitHub Actions, GitLab CI, Jenkins compatibility
- **Container Integration**: Docker, Podman execution environments
- **External Tools**: Package managers (npm/yarn/pnpm), template engines
- **Network Integration**: Remote repositories, push/pull operations
- **Security Integration**: Policy enforcement, command restrictions
- **Cross-Platform**: Windows, macOS, Linux compatibility

### 🤖 [validation-scripts.md](./validation-scripts.md)
Automated validation scripts for continuous compliance:
- **Structure Validators**: Single-package architecture compliance
- **Dependency Checkers**: Minimal dependencies, security audit
- **API Contract Validators**: Public API specification compliance
- **Performance Benchmarks**: Automated performance testing
- **Master Runner**: Complete validation suite execution

## Usage

### Quick Validation
```bash
# Run complete validation suite
./specs/validation/validate-all.sh

# Run specific validations
node specs/validation/validate-project-structure.mjs
node specs/validation/validate-dependencies.mjs
node specs/validation/validate-api-contracts.mjs
node specs/validation/run-performance-benchmarks.mjs
```

### Continuous Integration
The validation framework integrates with CI/CD pipelines:

```yaml
# .github/workflows/validation.yml
- name: Run GitVan v2 Validation Suite
  run: |
    chmod +x specs/validation/validate-all.sh
    specs/validation/validate-all.sh
```

### Development Workflow
1. **Before Implementation**: Review acceptance tests and compliance matrix
2. **During Development**: Run structure and API contract validators
3. **Before Commit**: Execute complete validation suite
4. **Before Release**: Run full integration and performance testing

## Validation Levels

### Level 1: Structure and Contracts
- ✅ Project structure compliance
- ✅ Dependency validation
- ✅ API contract verification
- ✅ TypeScript definition validation

### Level 2: Functional Testing
- ✅ Acceptance test scenarios
- ✅ Job execution validation
- ✅ Event processing verification
- ✅ Composables functionality

### Level 3: Performance and Integration
- ✅ Performance benchmarking
- ✅ Integration testing
- ✅ Cross-platform validation
- ✅ Security policy enforcement

### Level 4: Risk and Compliance
- ✅ Risk assessment framework
- ✅ Security validation
- ✅ Audit trail verification
- ✅ Compliance reporting

## Key Validation Points from v2.md

### Architecture Requirements
- ✅ Single package structure (no monorepo)
- ✅ Git-only runtime with no external database
- ✅ ESM modules with TypeScript definitions
- ✅ Node.js + Git dependencies only

### Core Functionality
- ✅ defineJob() with kind/meta/run structure
- ✅ Composables via unctx (useGit, useTemplate, useExec)
- ✅ Event-driven execution with filesystem routing
- ✅ Nunjucks templates with deterministic rendering
- ✅ Atomic locks with once-only execution semantics

### Worktree Support
- ✅ Per-worktree daemon execution
- ✅ Worktree-scoped locks and receipts
- ✅ Shared repository state in common gitdir
- ✅ CLI worktree selection (--worktrees flag)

### Security and Audit
- ✅ Signed commit verification
- ✅ Command execution allow-lists
- ✅ Immutable receipts in git notes
- ✅ Separation of duties support

### Performance Targets
- ✅ Local job execution p95 ≤ 300ms
- ✅ Local job execution p99 ≤ 800ms
- ✅ Memory usage ≤ 50MB steady state
- ✅ Time to first working < 10 minutes

## Quality Gates

### Pre-Merge Requirements
- [ ] All structure validations pass
- [ ] All API contracts verified
- [ ] Performance benchmarks meet targets
- [ ] Security validations pass
- [ ] Integration tests complete successfully

### Pre-Release Requirements
- [ ] Complete acceptance test coverage
- [ ] Risk mitigation plans implemented
- [ ] Cross-platform compatibility verified
- [ ] Performance baselines established
- [ ] Documentation updated and validated

## Maintenance

### Regular Reviews
- **Weekly**: Risk assessment updates for critical/high risks
- **Monthly**: Performance baseline reviews and compliance matrix updates
- **Quarterly**: Complete validation framework review and enhancement
- **Annually**: Full risk assessment and validation strategy review

### Continuous Improvement
1. Monitor validation execution times and optimize slow tests
2. Add new test scenarios based on user feedback and issues
3. Enhance risk mitigation strategies based on operational experience
4. Update performance targets based on user requirements and system capabilities

## Support and Escalation

**Validation Issues**: Create GitHub issue with validation failure details
**Performance Problems**: Include benchmark results and system specifications
**Security Concerns**: Follow security reporting procedures in main repository
**Integration Problems**: Provide environment details and integration test results

---

This validation framework ensures GitVan v2 meets all specifications while providing comprehensive quality assurance throughout the development lifecycle.