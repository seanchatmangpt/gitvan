# Procedure 08: Security Procedures

## Purpose
Maintain secure code, infrastructure, and operations through proactive security reviews, vulnerability management, and incident response.

## Scope
Security review process, vulnerability scanning, secret management, security incident response, and compliance verification.

## Frequency
- **Code Security Review**: Every PR
- **Dependency Scan**: Daily (automated)
- **Vulnerability Assessment**: Weekly
- **Security Audit**: Quarterly
- **Penetration Testing**: Annually
- **Secret Rotation**: Quarterly

## Responsible Party
**Primary**: All developers (code security), Security team (audits)
**Secondary**: DevOps, Team lead

## Prerequisites
- Security scanning tools configured
- Access to vulnerability database
- Security training completed
- Incident response plan understood

## Security Review Checklist

### Code Security
- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user inputs
- [ ] Output encoding to prevent XSS
- [ ] SQL injection prevention (parameterized queries)
- [ ] Authentication checks on protected endpoints
- [ ] Authorization verification
- [ ] Secure session management
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented
- [ ] Error messages don't leak information

### Dependencies
- [ ] No known vulnerabilities (high/critical)
- [ ] Dependencies from trusted sources
- [ ] Lock file committed
- [ ] Minimal dependency footprint
- [ ] Regular dependency updates

### Data Security
- [ ] Sensitive data encrypted at rest
- [ ] Sensitive data encrypted in transit (TLS)
- [ ] PII handling compliant
- [ ] Data retention policy followed
- [ ] Secure deletion implemented

## Step-by-Step Instructions

### Phase 1: Secure Development

**Step 1.1: Security Review During Code Review**
```bash
# As part of PR review, check:

# 1. No secrets committed
git grep -i "api.key\|password\|secret" src/

# 2. Dependency vulnerabilities
npm audit

# 3. Security-sensitive patterns
grep -r "eval\|exec\|innerHTML\|dangerouslySetInnerHTML" src/

# 4. SQL queries are parameterized
grep -r "db.query.*\${\|db.query.*+" src/
```
**Expected Outcome**: No security issues found
**Verification**: Checklist items pass

**Step 1.2: Run Security Linter**
```bash
# ESLint security plugin
npm run lint -- --plugin security

# Or Semgrep
semgrep --config=p/security-audit src/

# Or Snyk
snyk code test
```
**Expected Outcome**: No security warnings
**Verification**: Clean scan results

**Step 1.3: Dependency Security Scan**
```bash
# Check for vulnerabilities
npm audit

# Fix automatically if possible
npm audit fix

# Review and fix manually
npm audit --json > audit-report.json
cat audit-report.json | jq '.vulnerabilities'
```
**Expected Outcome**: No high/critical vulnerabilities
**Verification**: Audit report clean

### Phase 2: Secret Management

**Step 2.1: Detect Secrets in Code**
```bash
# Before commit (git hook)
git-secrets --scan

# Scan entire repository
git-secrets --scan-history

# Or use gitleaks
gitleaks detect --source . --verbose
```
**Expected Outcome**: No secrets found
**Verification**: Clean scan

**Step 2.2: Remove Committed Secrets**
```bash
# If secret found in history:
# 1. Revoke the secret immediately
./scripts/revoke-secret.sh <secret-value>

# 2. Remove from Git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/file' \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (coordinate with team!)
git push origin --force --all

# 4. Notify all team members to re-clone
```
**Expected Outcome**: Secret removed and revoked
**Verification**: Secret no longer in repository or active

**Step 2.3: Use Environment Variables**
```javascript
// ✗ WRONG - Hardcoded secret
const apiKey = 'sk-1234567890abcdef';

// ✓ CORRECT - Environment variable
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY environment variable required');
}
```
**Expected Outcome**: Secrets externalized
**Verification**: No secrets in code

**Step 2.4: Rotate Secrets Regularly**
```bash
# Quarterly secret rotation
./scripts/rotate-secrets.sh --service gitvan --environment production

# Steps:
# 1. Generate new secret
# 2. Update secrets manager
# 3. Deploy updated configuration
# 4. Verify services using new secret
# 5. Revoke old secret after grace period
```
**Expected Outcome**: Secrets rotated
**Verification**: Services using new secrets

### Phase 3: Vulnerability Management

**Step 3.1: Daily Automated Scans**
```yaml
# .github/workflows/security.yml
name: Security Scan
on:
  schedule:
    - cron: '0 8 * * *'  # Daily at 8 AM
  push:
    branches: [ main ]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=high
      - name: Run Snyk
        run: npx snyk test --severity-threshold=high
```
**Expected Outcome**: Automated daily scans
**Verification**: GitHub Actions runs daily

**Step 3.2: Review Vulnerability Reports**
```bash
# Check latest scan results
gh run list --workflow=security.yml --limit 1
gh run view <run-id>

# Generate report
npm audit --json > vulnerability-report.json

# Prioritize vulnerabilities
cat vulnerability-report.json | jq '.vulnerabilities | to_entries | map({key: .key, severity: .value.severity}) | group_by(.severity)'
```
**Expected Outcome**: Vulnerabilities prioritized
**Verification**: Action plan created

**Step 3.3: Remediate Vulnerabilities**
```bash
# For each high/critical vulnerability:

# 1. Check if auto-fixable
npm audit fix

# 2. Manual update if needed
npm update <package>

# 3. Test after update
npm test

# 4. If no fix available:
#    - Add to security exceptions (with approval)
#    - Implement mitigations
#    - Monitor for patch

# Document decision
echo "## CVE-2024-12345
- Severity: High
- Package: example-package
- Status: No fix available
- Mitigation: Input sanitization added
- Review: 2026-02-08
" >> SECURITY_EXCEPTIONS.md
```
**Expected Outcome**: Vulnerabilities addressed
**Verification**: Risk accepted or mitigated

### Phase 4: Security Testing

**Step 4.1: Input Validation Testing**
```javascript
// tests/security/input-validation.test.mjs
import { describe, it, expect } from 'vitest';

describe('Input Validation', () => {
  it('should reject SQL injection attempts', async () => {
    const maliciousInput = "'; DROP TABLE users; --";

    await expect(
      processInput(maliciousInput)
    ).rejects.toThrow('Invalid input');
  });

  it('should reject XSS attempts', async () => {
    const maliciousInput = '<script>alert("XSS")</script>';

    const result = await processInput(maliciousInput);
    expect(result).not.toContain('<script>');
  });

  it('should reject path traversal attempts', async () => {
    const maliciousPath = '../../../etc/passwd';

    await expect(
      readFile(maliciousPath)
    ).rejects.toThrow('Invalid path');
  });
});
```
**Expected Outcome**: Security tests pass
**Verification**: Malicious inputs rejected

**Step 4.2: Authentication Testing**
```javascript
describe('Authentication', () => {
  it('should require authentication for protected endpoints', async () => {
    const response = await fetch('/api/protected');
    expect(response.status).toBe(401);
  });

  it('should reject invalid tokens', async () => {
    const response = await fetch('/api/protected', {
      headers: { Authorization: 'Bearer invalid-token' }
    });
    expect(response.status).toBe(401);
  });

  it('should prevent brute force attacks', async () => {
    // Attempt 10 failed logins
    for (let i = 0; i < 10; i++) {
      await attemptLogin('user', 'wrong-password');
    }

    // Should be rate limited
    const response = await attemptLogin('user', 'correct-password');
    expect(response.status).toBe(429); // Too Many Requests
  });
});
```
**Expected Outcome**: Auth protections working
**Verification**: Tests pass

**Step 4.3: Penetration Testing**
```bash
# Annual penetration testing (engage security firm)

# Or use automated tools:
# OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://staging.gitvan.example.com

# Nikto web scanner
nikto -h https://staging.gitvan.example.com

# Review results and remediate
```
**Expected Outcome**: Vulnerabilities identified
**Verification**: Remediation plan created

### Phase 5: Security Incident Response

**Step 5.1: Detect Security Incident**
```bash
# Indicators:
# - Unusual access patterns in logs
# - Unexpected data exfiltration
# - Failed authentication spikes
# - Security tool alerts
# - User reports of suspicious activity

# Immediately classify severity:
# - P0: Active breach, data exposure
# - P1: Potential breach, vulnerability exploited
# - P2: Security vulnerability found
# - P3: Security concern
```
**Expected Outcome**: Incident detected and classified
**Verification**: Severity assigned

**Step 5.2: Contain Incident**
```bash
# For active breach:

# 1. Isolate affected systems
./scripts/isolate-system.sh <system-id>

# 2. Revoke compromised credentials
./scripts/revoke-all-sessions.sh
./scripts/rotate-secrets.sh --emergency

# 3. Enable additional logging
./scripts/enable-security-logging.sh --verbose

# 4. Preserve evidence
./scripts/snapshot-system.sh <system-id>
./scripts/collect-logs.sh --since <incident-time>
```
**Expected Outcome**: Incident contained
**Verification**: No further unauthorized access

**Step 5.3: Investigate and Remediate**
```bash
# Analyze logs
./scripts/analyze-security-logs.sh --since <incident-time>

# Identify scope
# - What was accessed?
# - What data was exposed?
# - How did attacker gain access?
# - Are there other vulnerabilities?

# Remediate
# - Patch vulnerability
# - Update security controls
# - Implement additional monitoring

# Verify remediation
./scripts/verify-security-fix.sh
```
**Expected Outcome**: Vulnerability fixed
**Verification**: Cannot be re-exploited

**Step 5.4: Notify Affected Parties**
```bash
# Legal requirements (GDPR, etc.)
# - Notify affected users within 72 hours
# - Notify regulatory bodies
# - Document notification

# Template:
# "We are writing to inform you of a security incident that may have affected your data..."
```
**Expected Outcome**: Notifications sent
**Verification**: Compliance requirements met

### Phase 6: Compliance and Audit

**Step 6.1: Security Compliance Checklist**
```markdown
## Quarterly Security Audit

### Access Control
- [ ] Principle of least privilege enforced
- [ ] Regular access reviews completed
- [ ] Terminated users removed within 24h
- [ ] MFA enabled for all accounts

### Data Protection
- [ ] Encryption at rest enabled
- [ ] TLS 1.3 for all connections
- [ ] Data retention policy followed
- [ ] Backup encryption verified

### Monitoring
- [ ] Security logs centralized
- [ ] Alert thresholds configured
- [ ] 24/7 monitoring active
- [ ] Incident response plan tested

### Vulnerability Management
- [ ] No high/critical vulnerabilities outstanding
- [ ] Dependency scans daily
- [ ] Penetration test completed
- [ ] Security patches up to date
```
**Expected Outcome**: Compliance verified
**Verification**: Audit report approved

**Step 6.2: Generate Compliance Report**
```bash
# Generate security report
./scripts/generate-security-report.sh --quarter Q1-2026

# Report includes:
# - Vulnerability scan results
# - Security incidents (if any)
# - Remediation actions
# - Compliance status
# - Risk assessment

# Submit to compliance team
```
**Expected Outcome**: Report generated
**Verification**: Compliance team approves

## Success Criteria

- [ ] No secrets in code
- [ ] No high/critical vulnerabilities
- [ ] Security scans automated
- [ ] All security tests pass
- [ ] Secrets rotated quarterly
- [ ] Security incidents documented
- [ ] Compliance requirements met
- [ ] Team trained on security

## Troubleshooting

### Issue: False Positive in Security Scan
```bash
# Document why it's false positive
echo "## NPM Audit: Vulnerability in dev-only package
- Package: test-framework
- Severity: High
- Justification: Only used in development, not in production
- Mitigation: N/A
- Exception approved by: Security Team
- Review date: 2026-02-08
" >> SECURITY_EXCEPTIONS.md

# Suppress in future scans
npm audit --json | jq '.vulnerabilities | keys' > .audit-suppress
```

### Issue: Cannot Update Vulnerable Dependency
```bash
# Check if transitive dependency
npm ls <vulnerable-package>

# Update parent package
npm update <parent-package>

# If no update available:
# 1. Find alternative package
# 2. Implement mitigation
# 3. Document exception
# 4. Monitor for updates
```

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## References
- [Incident Management](07-INCIDENT-MANAGEMENT.md)
- [Configuration Management](05-CONFIGURATION-MANAGEMENT.md)
- [SECURITY.md](/home/user/gitvan/SECURITY.md)

## Training Requirements
**Duration**: 3 hours + annual security training
**Competency**: Can identify security issues, implement secure code, respond to incidents

## Revision History
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-08 | 1.0 | Initial creation | GitVan Team |

---

**Remember**: Security is everyone's responsibility. If you see something, say something.
