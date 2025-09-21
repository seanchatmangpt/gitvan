/**
 * Noun-Verb CLI Pattern Comparison Examples
 *
 * Demonstrates different noun-verb CLI implementation patterns
 * with practical examples for enterprise use cases.
 */

import { command, domain, resource } from '../src/command-builder.js'

console.log('🔍 Noun-Verb CLI Pattern Comparison Examples\n')

// ============================================================================
// PATTERN 1: DOMAIN-FIRST APPROACH
// ============================================================================
console.log('📋 Pattern 1: Domain-First Approach')
console.log('='.repeat(60))
console.log('Structure: <cli-name> <domain> <resource> <action> [options]')
console.log('Use Case: Enterprise applications with clear business domains')
console.log()

// Infrastructure domain
const infraServerCreate = domain('infra')
  .server()
  .create()
  .arg('type', 'web')
  .arg('region', 'us-east-1')
  .option('size', 'large')
  .option('backup', true)

console.log('Infrastructure - Create Server:')
console.log(infraServerCreate.build())
console.log()

// Development domain
const devProjectDeploy = domain('dev')
  .project()
  .deploy()
  .arg('name', 'my-enterprise-app')
  .arg('environment', 'staging')
  .option('region', 'us-east-1')
  .option('instances', 3)

console.log('Development - Deploy Project:')
console.log(devProjectDeploy.build())
console.log()

// Security domain
const securityUserAudit = domain('security')
  .user()
  .audit()
  .arg('user', 'john.doe')
  .option('days', 30)
  .option('format', 'json')

console.log('Security - Audit User:')
console.log(securityUserAudit.build())
console.log()

console.log('✅ Domain-First Strengths:')
console.log('• Clear domain separation')
console.log('• Easy to understand business context')
console.log('• Scalable to many domains')
console.log('• Natural for enterprise organizations')
console.log()

// ============================================================================
// PATTERN 2: RESOURCE-FIRST APPROACH
// ============================================================================
console.log('📋 Pattern 2: Resource-First Approach')
console.log('='.repeat(60))
console.log('Structure: <cli-name> <resource> <action> [options]')
console.log('Use Case: Applications with distinct resource types')
console.log()

// Server operations
const serverCreate = resource('infra', 'server').create().arg('type', 'web').option('size', 'large')

const serverList = resource('infra', 'server')
  .list()
  .option('region', 'us-east-1')
  .option('filter', 'active')

console.log('Server - Create:')
console.log(serverCreate.build())
console.log()

console.log('Server - List:')
console.log(serverList.build())
console.log()

// User operations
const userCreate = resource('security', 'user')
  .create()
  .arg('name', 'john.doe')
  .arg('role', 'developer')

const userList = resource('security', 'user')
  .list()
  .option('role', 'developer')
  .option('active', true)

console.log('User - Create:')
console.log(userCreate.build())
console.log()

console.log('User - List:')
console.log(userList.build())
console.log()

console.log('✅ Resource-First Strengths:')
console.log('• Shorter command strings')
console.log('• Direct and intuitive')
console.log('• Faster for experienced users')
console.log('• Less verbose')
console.log()

// ============================================================================
// PATTERN 3: ACTION-FIRST APPROACH
// ============================================================================
console.log('📋 Pattern 3: Action-First Approach')
console.log('='.repeat(60))
console.log('Structure: <cli-name> <action> <resource> [options]')
console.log('Use Case: CRUD-heavy applications with clear action patterns')
console.log()

// Create operations
const createServer = command()
  .command('create', 'server')
  .arg('type', 'web')
  .arg('region', 'us-east-1')

const createUser = command()
  .command('create', 'user')
  .arg('name', 'john.doe')
  .arg('role', 'developer')

console.log('Create - Server:')
console.log(createServer.build())
console.log()

console.log('Create - User:')
console.log(createUser.build())
console.log()

// List operations
const listServers = command()
  .command('list', 'servers')
  .option('region', 'us-east-1')
  .option('filter', 'active')

const listUsers = command()
  .command('list', 'users')
  .option('role', 'developer')
  .option('active', true)

console.log('List - Servers:')
console.log(listServers.build())
console.log()

console.log('List - Users:')
console.log(listUsers.build())
console.log()

console.log('✅ Action-First Strengths:')
console.log('• Action-focused workflow')
console.log('• Consistent action patterns')
console.log('• Easy to learn action verbs')
console.log('• Good for CRUD-heavy applications')
console.log()

// ============================================================================
// PATTERN 4: CONTEXT-AWARE APPROACH
// ============================================================================
console.log('📋 Pattern 4: Context-Aware Approach')
console.log('='.repeat(60))
console.log('Structure: Commands inherit context from environment')
console.log('Use Case: Workflow-based operations with repetitive context')
console.log()

// Set enterprise context
const enterpriseContext = {
  project: 'enterprise-prod',
  environment: 'staging',
  region: 'us-east-1',
  compliance: 'sox',
  user: 'admin',
  role: 'admin',
}

// Commands with context
const contextualServerCreate = command('infra', 'server', 'create')
  .arg('type', 'web')
  .context(enterpriseContext)

const contextualUserCreate = command('security', 'user', 'create')
  .arg('name', 'john.doe')
  .arg('role', 'developer')
  .context(enterpriseContext)

console.log('Enterprise Context:')
console.log(JSON.stringify(enterpriseContext, null, 2))
console.log()

console.log('Contextual - Server Create:')
console.log(contextualServerCreate.build())
console.log()

console.log('Contextual - User Create:')
console.log(contextualUserCreate.build())
console.log()

console.log('✅ Context-Aware Strengths:')
console.log('• Reduces command verbosity')
console.log('• Maintains context across operations')
console.log('• Flexible context override')
console.log('• Good for workflow-based operations')
console.log()

// ============================================================================
// PATTERN 5: HYBRID APPROACH (Our Implementation)
// ============================================================================
console.log('📋 Pattern 5: Hybrid Approach (Our Implementation)')
console.log('='.repeat(60))
console.log('Structure: Multiple patterns combined based on use case')
console.log('Use Case: Flexible applications with diverse user types')
console.log()

// Domain-first for complex operations
const hybridInfraServer = domain('infra')
  .server()
  .create()
  .arg('type', 'web')
  .arg('region', 'us-east-1')
  .option('size', 'large')

// Resource-first for simple operations
const hybridServerList = resource('infra', 'server')
  .list()
  .option('region', 'us-east-1')
  .option('filter', 'active')

// Direct construction for specific cases
const hybridUserCreate = command('security', 'user', 'create')
  .arg('name', 'john.doe')
  .arg('role', 'developer')
  .context(enterpriseContext)

console.log('Hybrid - Domain-First (Complex):')
console.log(hybridInfraServer.build())
console.log()

console.log('Hybrid - Resource-First (Simple):')
console.log(hybridServerList.build())
console.log()

console.log('Hybrid - Direct Construction (Specific):')
console.log(hybridUserCreate.build())
console.log()

console.log('✅ Hybrid Approach Strengths:')
console.log('• Flexible approach')
console.log('• Optimizes for different use cases')
console.log('• Can evolve over time')
console.log('• Balances verbosity and clarity')
console.log()

// ============================================================================
// COMPARISON SUMMARY
// ============================================================================
console.log('📊 Pattern Comparison Summary')
console.log('='.repeat(60))

const patterns = [
  {
    name: 'Domain-First',
    verbosity: 'High',
    clarity: 'High',
    scalability: 'High',
    learningCurve: 'Medium',
    enterpriseFit: 'Excellent',
  },
  {
    name: 'Resource-First',
    verbosity: 'Medium',
    clarity: 'Medium',
    scalability: 'Medium',
    learningCurve: 'Low',
    enterpriseFit: 'Good',
  },
  {
    name: 'Action-First',
    verbosity: 'Low',
    clarity: 'Low',
    scalability: 'Low',
    learningCurve: 'Low',
    enterpriseFit: 'Fair',
  },
  {
    name: 'Context-Aware',
    verbosity: 'Low',
    clarity: 'Medium',
    scalability: 'High',
    learningCurve: 'Medium',
    enterpriseFit: 'Good',
  },
  {
    name: 'Hybrid (Ours)',
    verbosity: 'Variable',
    clarity: 'Medium',
    scalability: 'High',
    learningCurve: 'Medium',
    enterpriseFit: 'Excellent',
  },
]

console.log('| Pattern        | Verbosity | Clarity | Scalability | Learning | Enterprise |')
console.log('|----------------|-----------|---------|-------------|----------|------------|')
patterns.forEach((pattern) => {
  console.log(
    `| ${pattern.name.padEnd(14)} | ${pattern.verbosity.padEnd(9)} | ${pattern.clarity.padEnd(
      7
    )} | ${pattern.scalability.padEnd(11)} | ${pattern.learningCurve.padEnd(
      7
    )} | ${pattern.enterpriseFit.padEnd(10)} |`
  )
})

console.log()

// ============================================================================
// ENTERPRISE RECOMMENDATIONS
// ============================================================================
console.log('🏢 Enterprise Recommendations')
console.log('='.repeat(60))

console.log('For Fortune 500 Enterprises:')
console.log('• Primary Pattern: Domain-First with Context-Aware')
console.log('• Implementation: Static Definition with Dynamic Extensions')
console.log('• Framework: Citty or Oclif')
console.log('• Rationale: Clear domain separation aligns with enterprise structure')
console.log()

console.log('For Development Teams:')
console.log('• Primary Pattern: Resource-First with Action-First fallback')
console.log('• Implementation: Convention-Based Discovery')
console.log('• Framework: Commander.js or Yargs')
console.log('• Rationale: Resource-first is intuitive for developers')
console.log()

console.log('For Complex Applications:')
console.log('• Primary Pattern: Hierarchical with Context-Aware')
console.log('• Implementation: Configuration-Driven with Dynamic Registration')
console.log('• Framework: Custom implementation with Citty')
console.log('• Rationale: Hierarchical handles complex domain relationships')
console.log()

console.log('✅ Our Implementation Advantages:')
console.log('• Multiple entry points for different user preferences')
console.log('• Built-in enterprise context management')
console.log('• Fluent API with intuitive method chaining')
console.log('• Seamless integration with testing runners')
console.log('• Flexible pattern selection based on use case')
console.log()

console.log('🎯 Conclusion:')
console.log('Our hybrid implementation provides the best of multiple worlds,')
console.log('offering flexibility while maintaining enterprise-grade features.')
console.log('It adapts to different user types and use cases, making it')
console.log('ideal for complex enterprise CLI testing scenarios.')
