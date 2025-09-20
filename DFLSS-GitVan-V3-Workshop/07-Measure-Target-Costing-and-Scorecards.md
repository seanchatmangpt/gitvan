# Measure: Target Costing and Scorecards

## Target Costing for GitVan v3.0

Target costing is a management approach that designs a product to a specific cost target. It starts with the market price and desired profit margin to determine the allowable cost, rather than costing the design and then setting a price. For an internal software project like GitVan v3, we can adapt this by using the project budget as our target.

**Total Project Budget:** $575,000

Our goal is to allocate this budget across the major feature sets (or "cost objects") of the project to ensure we can deliver the full scope within the financial constraints.

### Budget Allocation by Project Phase

Based on the v3.0 Release Plan, we can allocate the budget according to the planned phases.

| Phase | Key Deliverables | Estimated Effort (FTE-Months) | Target Cost (Salaries) | Target Cost (Infrastructure) | Total Target Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 1: Foundation** | Address v2 gaps, improve tests, optimize performance. | 2.0 | $83,000 | $5,000 | **$88,000** |
| **Phase 2: Autonomic Engine** | Self-learning system, advanced AI, intelligent automation. | 4.0 | $167,000 | $20,000 | **$187,000** |
| **Phase 3: Enterprise** | SSO, audit logs, compliance, scalability. | 3.5 | $146,000 | $15,000 | **$161,000** |
| **Phase 4: Developer Exp.** | Web dashboard, IDE integration, CLI enhancements. | 2.5 | $104,000 | $10,000 | **$114,000** |
| **Total** | | **12.0** | **$500,000** | **$50,000** | **$575,000** |

*Assumes an average loaded cost of ~$41,667 per FTE-Month.*

### Implications for Design

This top-down budget allocation sets clear constraints for the design and development of each phase. For example:

*   The **Autonomous Intelligence Engine**, being the most critical and complex part of v3, receives the largest portion of the budget.
*   The team must design a **Web Dashboard** and **IDE Integration** (Phase 4) that can be delivered within a ~$114,000 budget. This will force trade-offs. Perhaps the initial version of the dashboard will have fewer features, or the team might use a commercial component library to speed up development.

By setting these targets upfront, we ensure that financial constraints are a key input to the design process, not an afterthought.

---

## GitVan v3.0 Balanced Scorecard

A Balanced Scorecard provides a holistic view of project performance by tracking metrics across several different perspectives. It ensures we don't focus on one area (e.g., technical metrics) at the expense of others (e.g., user satisfaction).

We will use the Success Metrics from the v3.0 Release Plan to build our scorecard.

### GitVan v3.0 Project Balanced Scorecard (Q3 2025 Target)

| Perspective | Strategic Objective | Key Performance Indicator (KPI) | Target | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Financial** | Achieve positive ROI. | **Enterprise Adoption:** | 50+ enterprise customers | ⚪ |
| | Control project costs. | **Budget vs. Actual:** | < 5% variance | ⚪ |
| **Customer / User** | Deliver an excellent user experience. | **User Satisfaction:** | 4.5+ star rating | ⚪ |
| | Grow the user base. | **User Adoption:** | 10x increase in active users | ⚪ |
| | Make the tool easy to learn. | **Learning Curve:** | < 1 hour to productive usage | ⚪ |
| **Internal Process** | Ensure high product quality. | **Test Coverage:** | > 95% | ⚪ |
| | Improve development velocity. | **Cycle Time:** (PR open to merge) | < 24 hours | ⚪ |
| | Ensure system reliability. | **System Uptime:** | 99.9% | ⚪ |
| **Learning & Growth** | Foster a strong community. | **Community Growth:** | 1000+ GitHub stars | ⚪ |
| | Improve team skills. | **Team Certifications:** (e.g., AI/ML) | 2 team members certified | ⚪ |
| | Position as a market leader. | **Market Position:** | Top 3 Git automation tool | ⚪ |

*Status Key: ⚪ (Not Started), 🟡 (At Risk), 🟢 (On Track), ⚫ (Complete)*

### How We Will Use the Scorecard

This scorecard will be reviewed monthly by the project stakeholders.

*   It provides a **single-pane-of-glass** view of project health.
*   It helps identify areas that are lagging. For example, if `Test Coverage` is on track but `User Satisfaction` is low in beta, it signals that our tests may not be adequately capturing the user experience.
*   It forces a **balance** between competing priorities. We can't sacrifice quality for speed, or user experience for features, because all are being measured.

By using the Balanced Scorecard, we ensure that the GitVan v3.0 project is managed for overall success, not just for meeting technical specifications.
