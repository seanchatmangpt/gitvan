# Measure: Voice of the Customer (VoC)

## Gathering the Voice of the Customer for GitVan v3.0

The Voice of the Customer (VoC) is the foundation of the Measure phase. It is the process of capturing customer expectations, preferences, and aversions. For the GitVan v3.0 project, our "customers" are the developers who will use the tool. A primary source for our VoC is the "Current State Analysis" of GitVan v2.0.1, which identified several critical gaps. These gaps represent the explicit and implicit needs of our users.

### From Gaps to Needs

We can translate the identified gaps in v2.0.1 into customer needs. This forms the basis of our VoC data.

| v2.0.1 Gap | Customer Statement (The "Voice") | Implied Need (CTQ) |
| :--- | :--- | :--- |
| Missing AI SDK dependencies | "I want to use the latest AI models from providers like Anthropic and OpenAI, not just Ollama." | The system must support multiple AI providers. |
| Context initialization problems | "The tool feels unreliable; sometimes commands fail for no clear reason." | The system must be robust and have predictable context management. |
| Incomplete implementations / stubs | "I try to use a documented feature, but it just says 'not yet implemented'. It's frustrating." | The product must be complete and all advertised features must be functional. |
| Test coverage ~70% | "I'm worried about the stability and reliability of the tool with this many untested parts." | The system must be highly reliable and have comprehensive test coverage (>95%). |
| Performance bottlenecks (commit ops) | "The `save` command feels sluggish. I need my tools to be fast and not interrupt my flow." | Core operations must be highly performant (<100ms for common commands). |
| Incomplete documentation | "I can't figure out how to use the advanced features. The documentation is missing examples." | The product must have clear, comprehensive documentation with practical examples. |

### Affinity Diagram for Thematic Grouping

We can group these needs into broader themes using an affinity diagram.

**Theme 1: Performance & Reliability**
*   *Need:* Core operations must be highly performant.
*   *Need:* The system must be robust and have predictable context management.
*   *Need:* The system must be highly reliable and have comprehensive test coverage.

**Theme 2: Intelligence & Capability**
*   *Need:* The system must support multiple AI providers.
*   *Need:* The product must be complete and all advertised features must be functional.

**Theme 3: Developer Experience**
*   *Need:* The product must have clear, comprehensive documentation with practical examples.
*   *Implicit Need:* The tool should be easy and intuitive to use.
*   *Implicit Need:* The setup process should be seamless.

### Translating VoC to Critical-to-Quality (CTQ) Trees

Now, we break down the high-level needs into specific, measurable Critical-to-Quality (CTQ) characteristics. This is a crucial step to make the customer needs actionable for the design and development team.

#### CTQ Tree 1: Performance & Reliability

*   **Need:** A fast and reliable tool.
    *   **Driver:** System Performance
        *   **CTQ:** Startup Time < 2 seconds
        *   **CTQ:** Memory Footprint < 100MB
        *   **CTQ:** `save` command p99 latency < 100ms
    *   **Driver:** System Stability
        *   **CTQ:** Test Coverage > 95%
        *   **CTQ:** Uptime > 99.9%
        *   **CTQ:** Zero critical vulnerabilities

#### CTQ Tree 2: Intelligence & Capability

*   **Need:** A powerful and intelligent automation engine.
    *   **Driver:** AI Integration
        *   **CTQ:** Support for Ollama, OpenAI, and Anthropic models.
        *   **CTQ:** AI-powered workflow generation from natural language.
    *   **Driver:** Feature Completeness
        *   **CTQ:** 0 "not yet implemented" commands in the CLI.
        *   **CTQ:** All documented API endpoints are fully functional.

#### CTQ Tree 3: Developer Experience

*   **Need:** An intuitive and easy-to-use tool.
    *   **Driver:** Ease of Use
        *   **CTQ:** Setup time from install to first workflow < 30 seconds.
        *   **CTQ:** Learning curve to productive usage < 1 hour.
    *   **Driver:** Documentation & Support
        *   **CTQ:** 100% of public APIs are documented with examples.
        *   **CTQ:** A comprehensive troubleshooting guide is available.

With these quantified CTQs, we have translated the vague "Voice of the Customer" into a concrete set of measurable targets. These targets will guide our design and development efforts in the subsequent phases of the DMEDI process.
