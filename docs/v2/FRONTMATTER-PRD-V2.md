GitVan v2: Front-Matter Templating Engine PRD
1. Summary
This document outlines the requirements for a production-grade, Hygen-style front-matter templating engine for GitVan v2. This feature will allow templates to be self-describing, enabling them to define their output paths, conflict policies, and conditional logic directly within the template file. By parsing this metadata, GitVan can offer a safe, deterministic, and auditable "plan-then-apply" workflow for generating and modifying files, which is critical for automating the "dark-matter 80/20" of developer tasks like scaffolding and documentation.

2. The Problem
Developers waste significant time on repetitive scaffolding and boilerplate tasks. Existing solutions are often simple file copies that lack logic, context, and safety. There is no standard, machine-readable way to:

Define where a template's output should be written.

Handle file conflicts safely (e.g., skip, overwrite, or append).

Conditionally render a template based on repository state or user input.

Perform idempotent injections into existing files.

Create a verifiable, auditable receipt of the entire generation process.

This leads to inconsistent project structures, manual rework, and a high risk of error.

3. Goals and Non-Goals
Goals
To enable self-describing templates by embedding operational logic in front-matter.

To provide a safe, two-phase plan and apply lifecycle for all generative tasks.

To implement a full set of Hygen-style operations, including multi-file output, content injection, and static asset copying.

To ensure every operation is auditable by generating a detailed receipt in Git notes.

To provide concurrency safety through atomic, Git-native locking.

Non-Goals
Interactive Prompts: This version will not implement the interactive prompts: [] feature from Hygen. All inputs must be provided non-interactively.

Support for Other Template Engines: Nunjucks is the sole supported engine.

A GUI or Web Interface: This feature is purely CLI-driven.

4. Personas and User Stories
As a Developer, I want to scaffold a new Next.js component from a single template file so that the file is placed in the correct directory with the correct name without manual intervention.

As a Release Manager, I want to use a template to idempotently inject a new release section into the SUMMARY.md of an mdBook without corrupting the file.

As a DevEx Engineer, I want to create a project starter pack that can generate multiple files and copy static assets from a single command, ensuring project consistency.

As a Compliance Officer, I need a verifiable receipt that shows exactly which template was used, what data was provided, and what files were written or changed during a scaffolding operation.

5. Functional Requirements
5.1. Front-Matter Parsing
The engine MUST parse YAML (

---), TOML (+++), and JSON front-matter using gray-matter. 




The parser MUST be able to handle alternate enclosures, such as fenced code blocks and after-shebang headers. 



The parser MUST enforce a configurable size limit on the front-matter block to prevent denial-of-service. 


Parsed front-matter keys MUST be normalized to a consistent, documented schema (e.g., 

skipIfExists -> skip_if_exists). 

5.2. Nunjucks Rendering
The values within the front-matter (e.g., the 

to path) MUST be rendered with Nunjucks, allowing them to contain template variables. 


The body of the template MUST be rendered with a merged context containing global helpers, front-matter data, and user-provided data. 

5.3. The Plan/Apply Lifecycle
The engine MUST expose a 

plan method that returns a serializable plan object detailing all intended operations without writing to the filesystem. 

The engine MUST expose an 

apply method that takes a plan object and executes it. 

The 

apply method MUST support a dryRun mode that logs the planned operations but does not execute them. 

5.4. Operations and Control Flow
Conditional Logic (when): The plan method MUST evaluate a when expression in the front-matter. If the result is falsy, the plan MUST indicate that the operation should be skipped. 


Conflict Policy (force): The apply method MUST respect the force policy for file conflicts: 

error (default): Throw an error if the target file exists.

skip: Do nothing if the target file exists.

overwrite: Replace the existing file.

append: Append the rendered content to the existing file.


Injections (inject): The engine MUST support idempotent injections into existing files with before, after, at_line, and between placement strategies. 


Multi-Output (to, perFile): The engine MUST support writing to multiple files from a single template, as defined by a to: [] array or a perFile: [] array of objects. 


Static Copies (copy): The engine MUST support copying static files and directories as defined by a copy: [] array. 


Shell Hooks (sh): The engine MUST execute sh.before and sh.after shell commands, validating them against a configurable allowlist. 

5.5. GitVan Integration
Receipts: Upon completion of an apply operation, a detailed receipt MUST be written to the configured Git notes ref (e.g., refs/notes/gitvan/results). The receipt must include the template used, the final plan, the status of each operation (OK, ERROR, SKIPPED), and content hashes. 

Error Receipts: If any step in the apply phase fails, the engine MUST write a receipt with a status of ERROR and include the error message before re-throwing the error.

Locking: Before the apply phase begins, the engine MUST acquire an atomic lock for each target filesystem path. All locks MUST be released upon completion or failure in a 

finally block. 

6. Success Metrics
Adoption: At least 50% of new jobs created in the cookbook use front-matter for their generative logic.

Reliability: The rate of ERROR receipts for template operations is less than 1%.

Performance: The plan phase for a moderately complex template (e.g., 5 file writes, 2 injections) completes with a p95 latency of less than 100ms.

Safety: Zero reported incidents of unintended file overwrites or out-of-sandbox writes.