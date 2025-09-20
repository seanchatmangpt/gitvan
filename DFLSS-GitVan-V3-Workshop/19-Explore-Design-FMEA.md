# Explore: Design FMEA

## What is Design FMEA?

**Design Failure Mode and Effects Analysis (DFMEA)** is a systematic, proactive tool used to identify and mitigate potential risks in a design *before* they can impact the customer. It is a living document that is created during the Explore and Develop phases.

The process involves:

1.  Identifying the functions of a design.
2.  Brainstorming potential **Failure Modes** (how could it fail?).
3.  Identifying the potential **Effects** of that failure.
4.  Identifying the potential **Causes** of that failure.
5.  Scoring the Severity, Occurrence, and Detection of each failure mode.
6.  Calculating a **Risk Priority Number (RPN)** to prioritize risks.
7.  Developing and implementing an action plan to mitigate the high-priority risks.

## GitVan v3.0 Case Study: DFMEA for AI Workflow Generation

The GitVan v3 team is about to start detailed design on a new, high-risk feature: **AI-powered workflow generation from a natural language prompt.** Before they write any code, they conduct a DFMEA to anticipate and mitigate potential problems.

**Feature:** User types `gitvan workflow create "My new workflow prompt"` and the system generates a functional Turtle (.ttl) workflow file.

### DFMEA for AI Workflow Generation

| Function | Potential Failure Mode | Potential Effect of Failure | Severity (1-10) | Potential Cause(s) | Occurrence (1-10) | Current Controls | Detection (1-10) | RPN | Recommended Actions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Parse User Prompt** | Misinterprets user intent. | Generated workflow does not match what the user wanted. User frustration. | 7 | 6 | AI model returns unexpected output. | 3 | **126** | **Action:** Implement a confirmation step. After generating the workflow, show the user a plain-language summary of what the workflow will do and ask for confirmation before saving. **Owner:** AI Eng. |
| **2. Generate Turtle (.ttl) Code** | Generates syntactically incorrect Turtle code. | The workflow file is invalid and cannot be parsed by the workflow engine. Feature is completely broken. | 9 | 5 | 1. AI model hallucination.<br>2. Prompt not specific enough. | Unit tests for the AI prompt generation service. | 4 | **180** | **Action:** 1. Add a validation step that uses a SHACL shape to validate the generated Turtle code *before* saving the file. 2. If invalid, automatically retry the AI generation with a refined prompt. **Owner:** AI Eng. |
| **3. Generate SPARQL Queries** | Generates an inefficient or incorrect SPARQL query within the workflow. | The workflow runs but produces incorrect results or performs very slowly. Data corruption. | 8 | 4 | AI model lacks context about the user's specific knowledge graph schema. | Code review of generated workflows. | 6 | **192** | **Action:** 1. Enhance the AI prompt to include the schema/ontology of the target knowledge graph. 2. Implement a "dry-run" mode for workflows that shows the results of SPARQL queries without committing changes. **Owner:** Dev Lead. |
| **4. Handle Malicious Input** | User prompt contains an instruction to perform a destructive action (e.g., `delete all files`). | The AI generates a workflow that deletes user files or performs other destructive OS commands. | 10 | 3 | The AI model is too compliant and lacks safety guardrails. | Basic input sanitization. | 7 | **210** | **Action:** 1. Implement a strict sandbox for all OS commands executed by workflows. 2. Fine-tune the AI model with instructions to refuse to generate workflows that perform destructive actions. 3. Add a final human-in-the-loop approval gate for any workflow that contains high-risk commands. **Owner:** Security Arch. |
| **5. Performance** | AI generation takes too long (>10 seconds). | Poor user experience. User perceives the feature as slow and unusable. | 6 | 5 | 1. Large AI model.<br>2. Network latency to AI provider API. | None. | 8 | **240** | **Action:** 1. Implement streaming output so the user sees the generated code as it is being created. 2. Investigate using smaller, faster, fine-tuned local models for common workflow types. **Owner:** AI Eng. |

### Analysis and Action Plan

The DFMEA has allowed the team to proactively identify the most critical risks before writing a single line of production code:

1.  **Highest Risk (RPN 240): Performance.** The user experience will be poor if generation is slow. The team will prioritize implementing a streaming response and investigating smaller models.
2.  **Second Highest Risk (RPN 210): Malicious Input.** This is a critical security risk. The team will prioritize building a sandboxed execution environment and adding safety guardrails to the AI model.
3.  **Third Highest Risk (RPN 192): Incorrect SPARQL.** This could lead to subtle data corruption. The team will prioritize adding schema context to the prompt and building a "dry-run" feature.

By investing a few hours in a DFMEA, the team has created a clear, prioritized list of actions that will significantly reduce the risk of feature failure, security vulnerabilities, and poor user experience. This is a classic example of how DFLSS helps teams build quality into the design from the very beginning.
