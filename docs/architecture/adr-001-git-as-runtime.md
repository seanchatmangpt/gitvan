# ADR-001: Git as Workflow Runtime and Data Store

## Status
Accepted

## Context
GitVan needs a reliable, distributed, auditable runtime for workflow execution that doesn't require external infrastructure. Traditional workflow engines require databases, message queues, and compute clusters, adding operational complexity.

## Decision
We will use Git as the primary runtime, data store, and execution environment for all workflows.

### Implementation Strategy

**Git Primitives → Workflow Patterns Mapping:**
- **Commits**: Sequence patterns, checkpoints, state transitions
- **Branches**: Parallel execution paths, conditional routing
- **Merges**: Synchronization points, fan-in operations
- **Tags**: Milestones, version markers, completion signals
- **Notes**: Workflow data, execution receipts, task parameters
- **Refs**: Execution locks, policies, metadata

**Storage Architecture:**
- `refs/notes/gitvan` - Workflow definitions and event configurations
- `refs/notes/gitvan/results` - Signed execution receipts and outputs
- `refs/workflow/executions/<id>` - Execution locks for idempotency
- `refs/gitvan/policy/*` - Access controls and compliance rules

## Consequences

### Positive
- **No External Dependencies**: Eliminates need for databases, message queues, or compute infrastructure
- **Distributed by Default**: Git's distributed nature provides natural clustering and replication
- **Audit Trail Built-in**: Every operation has a cryptographic signature and immutable history
- **Deterministic**: Git's content-addressable storage ensures reproducible results
- **Developer Familiar**: Uses existing Git tooling and mental models
- **Offline Capable**: Works without network connectivity
- **Backup/Recovery**: Standard Git backup strategies apply

### Negative
- **Performance Constraints**: Git operations are file-system bound, not optimized for high-frequency operations
- **Concurrency Limits**: Git's locking model limits parallel execution within a single repository
- **Storage Overhead**: Git's object model can be inefficient for large workflow data
- **Complexity**: Mapping workflow concepts to Git primitives requires careful design

### Risks and Mitigations

**Risk**: Git repository growth with workflow data
**Mitigation**: Use separate notes refs, implement cleanup policies, periodic ref pruning

**Risk**: Merge conflicts in workflow state
**Mitigation**: Use atomic operations, execution locks, append-only patterns

**Risk**: Performance degradation with scale
**Mitigation**: Repository sharding, workflow distribution across repos

## Implementation Guidelines

### Pattern Implementation Rules
1. **Idempotency**: All operations must be safe to retry
2. **Atomicity**: Use Git's transactional nature for consistency
3. **Immutability**: Never modify existing workflow history
4. **Determinism**: Same inputs must produce same Git state

### Data Management
1. **Separation of Concerns**: Code in commits, workflow data in notes
2. **Versioning**: Use refs for workflow schema evolution
3. **Cleanup**: Automated pruning of old execution data
4. **Security**: Signed commits and notes for tamper evidence

### Performance Optimization
1. **Lazy Loading**: Only read notes when needed
2. **Batching**: Group operations to minimize Git calls
3. **Caching**: In-memory caching of frequently accessed data
4. **Pruning**: Regular cleanup of temporary refs and old receipts

## Alternatives Considered

### Traditional Workflow Engines (Rejected)
- **Airflow, Prefect, Temporal**: Require external infrastructure, databases, and operational overhead
- **Pros**: Purpose-built for workflows, rich UIs, advanced scheduling
- **Cons**: Infrastructure complexity, vendor lock-in, operational burden

### File-based Storage (Rejected)
- **JSON/YAML files in filesystem**: Simple but lacks distribution, history, and locking
- **Pros**: Simple implementation, fast access
- **Cons**: No distribution, no audit trail, concurrency issues

### Database-backed (Rejected)
- **PostgreSQL, SQLite**: Traditional data storage with workflow tables
- **Pros**: ACID properties, query capabilities, performance
- **Cons**: External dependency, no distribution, operational overhead

## Related Decisions
- ADR-002: Deterministic Receipt Generation
- ADR-003: 43 Pattern Implementation Strategy
- ADR-004: LLM Integration with Seeded Outputs