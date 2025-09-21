# Noun-Verb CLI Testing Framework Implementation Patterns

## Overview

This document catalogs and compares different approaches for implementing noun-verb CLI testing within the `citty-test-utils` framework itself, focusing on how we structure and execute enterprise CLI tests.

## Current Implementation Analysis

### Our Current Approach: **Fluent Command Builder**

```javascript
// Current implementation
const cmd = command('infra', 'server', 'create')
  .arg('type', 'web')
  .option('size', 'large')
  .context({ project: 'enterprise-prod' })

const result = await cmd.execute()
result.expectSuccess().expectOutput(/Server created/)
```

## Alternative Testing Framework Implementations

### 1. **Direct Array Testing**
**Approach**: Pass command arrays directly to runners

```javascript
// Implementation
const result = await runLocalCitty(['infra', 'server', 'create', '--type', 'web', '--size', 'large'])
result.expectSuccess().expectOutput(/Server created/)

// With context
const result = await runLocalCitty(['infra', 'server', 'create', '--type', 'web'], {
  env: { ENTERPRISE_PROJECT: 'enterprise-prod' }
})
```

**Strengths**:
- Simple and direct
- No abstraction overhead
- Easy to understand
- Fast execution

**Weaknesses**:
- Verbose for complex commands
- No command validation
- Hard to maintain
- No context management

**Best For**: Simple tests, quick prototyping

### 2. **String Template Testing**
**Approach**: Use string templates for command construction

```javascript
// Implementation
const cmd = `infra server create --type web --size large --project ${project}`
const result = await runLocalCitty(cmd.split(' '))
result.expectSuccess().expectOutput(/Server created/)

// With template variables
const cmd = template`infra ${resource} ${action} --type ${type} --region ${region}`
const result = await runLocalCitty(cmd({ resource: 'server', action: 'create', type: 'web', region: 'us-east-1' }))
```

**Strengths**:
- Familiar string syntax
- Easy template substitution
- Readable command construction
- Flexible formatting

**Weaknesses**:
- No type safety
- Hard to validate
- Prone to syntax errors
- No IDE support

**Best For**: Dynamic command generation, template-based testing

### 3. **Object-Based Testing**
**Approach**: Use structured objects to define commands

```javascript
// Implementation
const cmd = {
  domain: 'infra',
  resource: 'server',
  action: 'create',
  args: { type: 'web', region: 'us-east-1' },
  options: { size: 'large', backup: true },
  context: { project: 'enterprise-prod' }
}

const result = await runObjectCommand(cmd)
result.expectSuccess().expectOutput(/Server created/)

// With validation
const cmd = {
  domain: 'infra',
  resource: 'server',
  action: 'create',
  args: { type: 'web' }, // Required
  options: { size: 'large' }, // Optional
  context: { project: 'enterprise-prod' }
}

const validatedCmd = validateCommand(cmd)
const result = await runObjectCommand(validatedCmd)
```

**Strengths**:
- Structured and clear
- Easy to validate
- Good for serialization
- Type-safe with TypeScript

**Weaknesses**:
- More verbose
- Less fluent
- Requires validation layer
- Not as intuitive

**Best For**: Complex command structures, API-driven testing

### 4. **Builder Pattern Testing**
**Approach**: Use builder pattern for command construction (our current approach)

```javascript
// Implementation
const result = await command('infra', 'server', 'create')
  .arg('type', 'web')
  .option('size', 'large')
  .context({ project: 'enterprise-prod' })
  .execute()

result.expectSuccess().expectOutput(/Server created/)

// Domain-first
const result = await domain('infra')
  .server()
  .create()
  .arg('type', 'web')
  .execute()

// Resource-first
const result = await resource('infra', 'server')
  .create()
  .arg('type', 'web')
  .execute()
```

**Strengths**:
- Fluent and intuitive
- Multiple entry points
- Built-in validation
- Context management
- Type safety

**Weaknesses**:
- More complex implementation
- Learning curve
- Potential performance overhead
- More code to maintain

**Best For**: Enterprise testing, complex workflows

### 5. **Scenario-Based Testing**
**Approach**: Use scenario DSL for multi-step testing

```javascript
// Implementation
const result = await scenario('Server Creation Workflow')
  .step('Create Server')
  .run(['infra', 'server', 'create', '--type', 'web'])
  .expectSuccess()
  .expectOutput(/Server created/)
  
  .step('Verify Server')
  .run(['infra', 'server', 'list', '--type', 'web'])
  .expectSuccess()
  .expectOutput(/web-server-001/)
  
  .step('Configure Server')
  .run(['infra', 'server', 'configure', '--id', 'web-server-001', '--size', 'large'])
  .expectSuccess()
  
  .execute('local')

// With enterprise context
const result = await enterpriseScenario('Production Deployment')
  .context({ project: 'enterprise-prod', environment: 'production' })
  .step('Create Infrastructure')
  .infra.server.create({ type: 'web', region: 'us-east-1' })
  .expectSuccess()
  
  .step('Deploy Application')
  .dev.app.deploy({ project: 'my-app', environment: 'production' })
  .expectSuccess()
  
  .step('Setup Monitoring')
  .monitor.alert.create({ resource: 'web-server-001', metric: 'cpu' })
  .expectSuccess()
  
  .execute()
```

**Strengths**:
- Multi-step workflows
- Built-in context management
- Enterprise patterns
- Comprehensive testing

**Weaknesses**:
- Complex implementation
- Steep learning curve
- Overkill for simple tests
- Harder to debug

**Best For**: Complex enterprise workflows, integration testing

### 6. **Pre-built Scenario Testing**
**Approach**: Use pre-built scenarios for common patterns

```javascript
// Implementation
const result = await scenarios.infra.server.create('local').execute()
expect(result.success).toBe(true)
expect(result.result.stdout).toContain('Server created successfully')

// With options
const result = await scenarios.infra.server.create('cleanroom', {
  type: 'web',
  region: 'us-east-1',
  size: 'large'
}).execute()

// Cross-domain scenarios
const result = await scenarios.enterprise.deployment('local', {
  project: 'my-app',
  environment: 'staging',
  region: 'us-east-1'
}).execute()
```

**Strengths**:
- Pre-built patterns
- Consistent testing
- Easy to use
- Enterprise-ready

**Weaknesses**:
- Limited flexibility
- Hard to customize
- Requires maintenance
- Less control

**Best For**: Standard enterprise patterns, quick testing

### 7. **Hybrid Testing Approach**
**Approach**: Combine multiple approaches based on use case

```javascript
// Simple commands - Direct array
const result = await runLocalCitty(['--help'])
result.expectSuccess().expectOutput(/USAGE/)

// Complex commands - Builder pattern
const result = await command('infra', 'server', 'create')
  .arg('type', 'web')
  .execute()

// Workflows - Scenario DSL
const result = await scenario('Deployment')
  .step('Create Server')
  .run(['infra', 'server', 'create', '--type', 'web'])
  .expectSuccess()
  .execute()

// Enterprise patterns - Pre-built scenarios
const result = await scenarios.infra.server.lifecycle('local').execute()
```

**Strengths**:
- Flexible approach
- Optimizes for different use cases
- Best of all worlds
- Adaptable

**Weaknesses**:
- Inconsistent patterns
- Harder to learn
- Complex implementation
- Can confuse users

**Best For**: Diverse testing needs, evolving applications

## Implementation Comparison Matrix

| Approach | Simplicity | Flexibility | Enterprise Fit | Learning Curve | Maintenance |
|----------|------------|-------------|-----------------|----------------|-------------|
| Direct Array | High | Low | Fair | Low | Low |
| String Template | Medium | Medium | Good | Low | Medium |
| Object-Based | Medium | High | Good | Medium | Medium |
| Builder Pattern | Medium | High | Excellent | Medium | High |
| Scenario DSL | Low | Very High | Excellent | High | High |
| Pre-built Scenarios | High | Low | Excellent | Low | High |
| Hybrid | Medium | Very High | Excellent | High | High |

## Framework Implementation Strategies

### 1. **Layered Architecture**
```javascript
// Layer 1: Core runners
export { runLocalCitty, runCitty }

// Layer 2: Command builders
export { command, domain, resource }

// Layer 3: Scenario DSL
export { scenario, enterpriseScenario }

// Layer 4: Pre-built scenarios
export { scenarios }

// Layer 5: Enterprise utilities
export { contextManager, commandRegistry }
```

### 2. **Progressive Enhancement**
```javascript
// Start simple
const result = await runLocalCitty(['--help'])

// Add builder
const result = await command('infra', 'server', 'create').execute()

// Add context
const result = await command('infra', 'server', 'create')
  .context({ project: 'enterprise-prod' })
  .execute()

// Add scenarios
const result = await scenarios.infra.server.create('local').execute()
```

### 3. **Plugin Architecture**
```javascript
// Core framework
export { runLocalCitty, command, scenario }

// Enterprise plugin
export { enterpriseScenarios, contextManager }

// Domain plugins
export { infraScenarios, devScenarios, securityScenarios }
```

## Recommendations for citty-test-utils

### Current State Assessment
Our current implementation uses the **Builder Pattern** approach, which is excellent for enterprise use cases. We should enhance it with:

1. **Scenario DSL Integration**: Add scenario support to the builder
2. **Pre-built Scenarios**: Create enterprise scenario templates
3. **Context Management**: Enhance context handling
4. **Command Registry**: Add dynamic command discovery

### Implementation Strategy

#### Phase 1: Enhance Current Builder (Completed ✅)
- Fluent API with multiple entry points
- Enterprise context management
- Command validation and execution

#### Phase 2: Add Scenario DSL (In Progress)
- Multi-step workflow support
- Cross-domain scenario execution
- Enterprise workflow patterns

#### Phase 3: Pre-built Scenarios (Next)
- Enterprise scenario templates
- Domain-specific scenarios
- Cross-domain workflows

#### Phase 4: Advanced Features (Future)
- Command registry and discovery
- Plugin architecture
- Performance optimization

## Conclusion

Our current **Builder Pattern** implementation provides an excellent foundation for enterprise CLI testing. The key is to enhance it progressively with:

1. **Scenario DSL** for complex workflows
2. **Pre-built Scenarios** for common patterns
3. **Command Registry** for dynamic discovery
4. **Context Management** for enterprise workflows

This hybrid approach will give users the flexibility to choose the right pattern for their specific testing needs while maintaining the enterprise-grade features required for Fortune 500 applications.
