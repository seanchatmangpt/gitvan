# Explore: 80/20 Non-Git Knowledge Hooks

## 🎯 80/20 Non-Git Knowledge Hooks

### 1. **Issue & Project Tracking**

* **Sources**: Jira, GitHub Issues, Linear, Azure Boards.
* **Why**: Developers already organize work there. Hooks connect commits/pushes/merges to issue state.
* **Examples**:

  * Block merge if issue not in “QA Approved.”
  * Auto-update issue status when branch merged.

---

### 2. **CI/CD Build & Test Feeds**

* **Sources**: GitHub Actions, GitLab CI, Jenkins.
* **Why**: Developers need build/test pass info before wasting cycles.
* **Examples**:

  * Pre-push hook checks last pipeline health.
  * Abort deploy if last run failed.

---

### 3. **Vulnerability & Dependency Feeds**

* **Sources**: NVD CVE feeds, Snyk, npm advisories, Maven Central.
* **Why**: Security and compliance.
* **Examples**:

  * Block commit if new CVE affects current dependencies.
  * Auto-open patch PR if registry announces update.

---

### 4. **Monitoring & Ops Health**

* **Sources**: Prometheus, Grafana, Datadog, CloudWatch.
* **Why**: Don’t deploy into broken systems.
* **Examples**:

  * Block deploy hook if DB latency > threshold.
  * Warn if error budget nearly exhausted.

---

### 5. **Collaboration & Communication**

* **Sources**: Slack, Teams, Discord.
* **Why**: Developers live in chat. Hooks surface knowledge without extra dashboards.
* **Examples**:

  * Push triggers Slack alert with linked issues + commit summary.
  * Daily report hook posts open blockers into standup channel.

---

### 6. **Documentation & Knowledge Bases**

* **Sources**: Confluence, Notion, GitBook, internal wikis.
* **Why**: Keep docs synchronized with code.
* **Examples**:

  * Auto-update spec docs when schema changes.
  * Generate API docs pack on merge.

---

## 🧩 Pattern

The “dark matter” non-Git hooks = **five or six external streams** that matter to 90% of teams:

* Issues (work)
* CI/CD (builds/tests)
* Security feeds (vulnerabilities/dependencies)
* Monitoring (system health)
* Chat (team comms)
* Docs (knowledge bases)

Everything else is noise compared to these.
