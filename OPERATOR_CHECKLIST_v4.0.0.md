# GitVan v4.0.0 Operator Checklist

**Target Audience:** DevOps Engineers, System Administrators, Operations Teams
**Estimated Time:** 30-45 minutes for complete deployment
**Difficulty:** Low (zero breaking changes)

## Pre-Deployment Checklist

### Environment Verification

- [ ] **Verify Node.js version**
  ```bash
  node --version  # Must be 18.x or higher
  ```

- [ ] **Verify Git version**
  ```bash
  git --version  # Must be 2.30 or higher
  ```

- [ ] **Check current GitVan version**
  ```bash
  gitvan --version  # Should be v3.x
  ```

- [ ] **Verify disk space**
  ```bash
  df -h  # Need at least 100MB free for worker files
  ```

- [ ] **Check memory availability**
  ```bash
  free -m  # Recommend 512MB+ free memory
  ```

### Backup Procedures

- [ ] **Create Git bundle backup**
  ```bash
  git bundle create gitvan-backup-$(date +%Y%m%d).bundle --all
  ```

- [ ] **Backup Git notes (audit trail)**
  ```bash
  git notes --ref refs/notes/gitvan/audit show HEAD > notes-backup-$(date +%Y%m%d).txt
  ```

- [ ] **Backup configuration**
  ```bash
  cp gitvan.config.js gitvan.config.js.backup-$(date +%Y%m%d)
  cp package.json package.json.backup-$(date +%Y%m%d)
  ```

- [ ] **Document current job schedules**
  ```bash
  gitvan job list --format json > current-jobs-$(date +%Y%m%d).json
  ```

- [ ] **Save current job execution history**
  ```bash
  gitvan job history > job-history-$(date +%Y%m%d).log
  ```

### Environment Preparation

- [ ] **Stop any running jobs**
  ```bash
  # Check for running jobs
  ps aux | grep gitvan

  # Stop if needed
  pkill -f gitvan
  ```

- [ ] **Clear temporary files**
  ```bash
  # Clean old worker files (if they exist)
  rm -rf .gitvan/workers/*.mjs
  ```

- [ ] **Verify Git repository status**
  ```bash
  git status  # Should be clean
  git fsck    # Check repository integrity
  ```

- [ ] **Test Git notes access**
  ```bash
  git notes --ref refs/notes/gitvan/audit list
  ```

## Deployment Steps

### 1. Installation

- [ ] **Update package dependencies**
  ```bash
  npm install gitvan@4.0.0
  ```

  Expected output:
  ```
  added 82 packages, changed 1 package in 15s
  ```

- [ ] **Verify installation**
  ```bash
  gitvan --version
  # Should show: v4.0.0
  ```

- [ ] **Verify Bree dependency**
  ```bash
  npm list bree
  # Should show: bree@9.0.0
  ```

### 2. Backward Compatibility Verification

- [ ] **Test job listing**
  ```bash
  gitvan job list
  # Should show all existing jobs
  ```

- [ ] **Run a test job (legacy mode)**
  ```bash
  gitvan job run <test-job-name>
  # Should execute successfully
  ```

- [ ] **Verify Git notes written**
  ```bash
  git notes --ref refs/notes/gitvan/audit list | tail -5
  # Should show recent executions
  ```

- [ ] **Check job history**
  ```bash
  gitvan job history <test-job-name>
  # Should show execution receipts
  ```

### 3. Scheduler Configuration (Optional)

Only perform if enabling Bree scheduling:

- [ ] **Auto-schedule cron jobs**
  ```bash
  gitvan job auto-schedule
  # Lists jobs that will be scheduled
  ```

- [ ] **Verify scheduler configuration**
  ```bash
  gitvan job scheduler-status
  # Should show scheduled jobs
  ```

- [ ] **Add Bree configuration to gitvan.config.js (optional)**
  ```javascript
  export default {
    jobs: {
      dir: "jobs",
      bree: {
        timeout: 300000,              // 5 minute timeout
        interval: 1000,               // Check every 1 second
        closeWorkerAfterMs: 5000,     // Close workers after 5s
        removeCompleted: true,        // Auto-remove completed
      }
    }
  }
  ```

- [ ] **Start the scheduler**
  ```bash
  gitvan job start-scheduler
  ```

- [ ] **Verify scheduler is running**
  ```bash
  gitvan job scheduler-status
  # isRunning should be true
  ```

### 4. Monitoring Setup

- [ ] **Configure log monitoring**
  ```bash
  # Create log directory
  mkdir -p .gitvan/logs

  # Set log level
  export GITVAN_LOG_LEVEL=info
  ```

- [ ] **Set up log rotation**
  ```bash
  # Example logrotate config
  cat > /etc/logrotate.d/gitvan << EOF
  /path/to/repo/.gitvan/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
  }
  EOF
  ```

- [ ] **Configure process monitoring (systemd example)**
  ```bash
  # Create systemd service file
  cat > /etc/systemd/system/gitvan-scheduler.service << EOF
  [Unit]
  Description=GitVan Job Scheduler
  After=network.target

  [Service]
  Type=simple
  User=gitvan
  WorkingDirectory=/path/to/repo
  ExecStart=/usr/bin/gitvan job start-scheduler
  ExecStop=/usr/bin/gitvan job stop-scheduler
  Restart=on-failure
  RestartSec=10

  [Install]
  WantedBy=multi-user.target
  EOF

  # Enable and start
  systemctl daemon-reload
  systemctl enable gitvan-scheduler
  systemctl start gitvan-scheduler
  ```

- [ ] **Set up health checks**
  ```bash
  # Create health check script
  cat > /usr/local/bin/gitvan-health-check << 'EOF'
  #!/bin/bash
  STATUS=$(gitvan job scheduler-status --format json 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "CRITICAL: Scheduler not responding"
    exit 2
  fi

  IS_RUNNING=$(echo "$STATUS" | jq -r .isRunning)
  if [ "$IS_RUNNING" != "true" ]; then
    echo "WARNING: Scheduler not running"
    exit 1
  fi

  echo "OK: Scheduler running"
  exit 0
  EOF

  chmod +x /usr/local/bin/gitvan-health-check
  ```

### 5. Alert Configuration

- [ ] **Configure monitoring alerts**
  ```bash
  # Example: Prometheus metric export
  # Configure alerts for:
  # - Scheduler down
  # - Job failures
  # - Worker file accumulation
  # - Memory usage spikes
  ```

- [ ] **Set up email notifications (optional)**
  ```javascript
  // In gitvan.config.js
  export default {
    jobs: {
      notifications: {
        email: {
          enabled: true,
          from: "gitvan@example.com",
          to: ["ops@example.com"],
          smtp: {
            host: "smtp.example.com",
            port: 587,
          }
        }
      }
    }
  }
  ```

- [ ] **Configure Slack/Discord webhooks (optional)**
  ```javascript
  // In gitvan.config.js
  export default {
    jobs: {
      notifications: {
        slack: {
          enabled: true,
          webhookUrl: "https://hooks.slack.com/services/..."
        }
      }
    }
  }
  ```

## Post-Deployment Verification

### Functional Testing

- [ ] **Run comprehensive health check**
  ```bash
  /usr/local/bin/gitvan-health-check
  # Should return: OK: Scheduler running
  ```

- [ ] **Test job execution (legacy)**
  ```bash
  gitvan job run test-job
  # Should complete successfully
  ```

- [ ] **Test job execution (Bree)**
  ```bash
  gitvan job schedule test-job --cron "*/5 * * * *"
  gitvan job start-scheduler
  # Wait 5 minutes
  gitvan job history test-job
  # Should show new execution
  ```

- [ ] **Verify worker cleanup**
  ```bash
  ls .gitvan/workers/
  # Should be empty or minimal after executions
  ```

- [ ] **Check memory usage**
  ```bash
  ps aux | grep gitvan | awk '{print $6}'
  # Should be reasonable (<100MB per process)
  ```

- [ ] **Verify Git notes integrity**
  ```bash
  git notes --ref refs/notes/gitvan/audit list | wc -l
  # Should match or exceed pre-deployment count
  ```

### Performance Baseline

- [ ] **Measure job execution time**
  ```bash
  time gitvan job run benchmark-job
  # Record time for comparison
  ```

- [ ] **Test concurrent execution**
  ```bash
  gitvan job run job1 &
  gitvan job run job2 &
  gitvan job run job3 &
  wait
  # All should complete without conflicts
  ```

- [ ] **Monitor system resources during execution**
  ```bash
  vmstat 1 10
  # While running: gitvan job run heavy-job
  ```

### Security Verification

- [ ] **Verify worker isolation**
  ```bash
  # Run a test job that attempts to access shared state
  # Should fail or be isolated
  ```

- [ ] **Check file permissions**
  ```bash
  ls -la .gitvan/workers/
  # Should have appropriate permissions (644 for files)
  ```

- [ ] **Verify audit trail**
  ```bash
  git notes --ref refs/notes/gitvan/audit show HEAD
  # Should contain recent execution data
  ```

- [ ] **Test deterministic execution**
  ```bash
  # Run same job twice with same input
  gitvan job run deterministic-job --payload '{"test": true}'
  gitvan job run deterministic-job --payload '{"test": true}'
  # Results should be identical
  ```

## Monitoring & Maintenance

### Daily Checks

- [ ] **Check scheduler status**
  ```bash
  gitvan job scheduler-status
  ```

- [ ] **Review logs for errors**
  ```bash
  tail -100 .gitvan/logs/jobs.log | grep -i error
  ```

- [ ] **Verify worker cleanup**
  ```bash
  ls .gitvan/workers/ | wc -l
  # Should be 0 or very low
  ```

- [ ] **Check disk space**
  ```bash
  df -h | grep -E '(Filesystem|gitvan)'
  ```

### Weekly Checks

- [ ] **Review job execution history**
  ```bash
  gitvan job history --last-week
  ```

- [ ] **Check for failed jobs**
  ```bash
  gitvan job history | grep -i "error"
  ```

- [ ] **Verify memory trends**
  ```bash
  # Review memory usage over past week
  sar -r 7
  ```

- [ ] **Review Git notes growth**
  ```bash
  git notes --ref refs/notes/gitvan/audit list | wc -l
  ```

### Monthly Maintenance

- [ ] **Clean old worker files (if accumulated)**
  ```bash
  find .gitvan/workers/ -name "*.mjs" -mtime +7 -delete
  ```

- [ ] **Review and archive old Git notes**
  ```bash
  # Archive notes older than 6 months
  git notes --ref refs/notes/gitvan/audit list | head -n 1000 > archive.txt
  ```

- [ ] **Update dependencies**
  ```bash
  npm outdated
  npm update
  ```

- [ ] **Review performance metrics**
  ```bash
  # Analyze job execution times
  gitvan job history --format json | jq '.[] | {job: .jobId, duration: .duration}'
  ```

## Rollback Procedure

### Immediate Rollback

If critical issues arise:

- [ ] **Stop the scheduler**
  ```bash
  gitvan job stop-scheduler
  # Or systemctl stop gitvan-scheduler
  ```

- [ ] **Reinstall previous version**
  ```bash
  npm install gitvan@3.0.0
  ```

- [ ] **Verify rollback**
  ```bash
  gitvan --version
  # Should show v3.0.0
  ```

- [ ] **Restore configuration**
  ```bash
  cp gitvan.config.js.backup-YYYYMMDD gitvan.config.js
  ```

- [ ] **Test jobs**
  ```bash
  gitvan job run test-job
  ```

- [ ] **Restore Git notes (if corrupted)**
  ```bash
  git notes --ref refs/notes/gitvan/audit add -f -F notes-backup-YYYYMMDD.txt HEAD
  ```

### Partial Rollback (Disable Bree Only)

- [ ] **Stop scheduler**
  ```bash
  gitvan job stop-scheduler
  ```

- [ ] **Unschedule all jobs**
  ```bash
  gitvan job list --format json | jq -r '.[] | .id' | while read job; do
    gitvan job unschedule "$job"
  done
  ```

- [ ] **Continue using legacy execution**
  ```bash
  gitvan job run my-job
  ```

## Troubleshooting Guide

### Issue: Scheduler won't start

```bash
# Check for port conflicts
netstat -tulpn | grep gitvan

# Check logs
tail -100 .gitvan/logs/jobs.log

# Verify configuration
gitvan job scheduler-status --debug

# Restart
gitvan job stop-scheduler
sleep 5
gitvan job start-scheduler
```

### Issue: Worker files accumulating

```bash
# Stop scheduler
gitvan job stop-scheduler

# Clean worker files
rm -rf .gitvan/workers/*.mjs

# Restart
gitvan job start-scheduler
```

### Issue: Jobs not executing

```bash
# Check job list
gitvan job list

# Verify scheduling
gitvan job scheduler-status

# Check cron syntax
# Visit https://crontab.guru/ to validate

# Re-schedule
gitvan job unschedule problematic-job
gitvan job schedule problematic-job --cron "0 * * * *"
```

### Issue: High memory usage

```bash
# Check worker configuration
cat gitvan.config.js | grep closeWorkerAfterMs

# Reduce worker lifetime
# In gitvan.config.js:
# closeWorkerAfterMs: 3000  (3 seconds)

# Restart scheduler
gitvan job stop-scheduler
gitvan job start-scheduler
```

## Documentation & Training

- [ ] **Update internal runbooks**
- [ ] **Document scheduler configuration**
- [ ] **Create operator training materials**
- [ ] **Update incident response procedures**
- [ ] **Document monitoring dashboards**
- [ ] **Create escalation procedures**

## Compliance & Audit

- [ ] **Document version upgrade in change log**
- [ ] **Update system inventory**
- [ ] **Verify audit trail compliance**
- [ ] **Update security documentation**
- [ ] **Review access controls**

## Contact Information

### Support Channels
- GitHub Issues: https://github.com/owner/gitvan/issues
- Email: support@gitvan.dev (if applicable)
- Slack: #gitvan-ops (if applicable)

### Escalation
- Level 1: Operations team
- Level 2: Development team
- Level 3: Architecture team

---

**Operator Checklist Version:** 1.0
**Last Updated:** January 8, 2026
**Applies To:** GitVan v4.0.0 Deployment
**Review Frequency:** Before each deployment
