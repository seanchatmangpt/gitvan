/**
 * Enterprise Command Builder Example
 *
 * Demonstrates the enterprise noun-verb CLI testing framework
 * with real-world examples for Fortune 500 enterprise needs.
 */

import { command, domain, resource } from '../src/command-builder.js'

console.log('🚀 Enterprise Noun-Verb CLI Testing Framework Demo\n')

// Example 1: Infrastructure Management
console.log('📋 Example 1: Infrastructure Management')
console.log('='.repeat(50))

// Create a web server
const createServerCmd = command('infra', 'server', 'create')
  .arg('type', 'web')
  .arg('region', 'us-east-1')
  .option('size', 'large')
  .option('backup', true)

console.log('Create Server Command:')
console.log(createServerCmd.build())
console.log()

// List servers
const listServersCmd = domain('infra')
  .resource('server')
  .list()
  .option('region', 'us-east-1')
  .option('filter', 'active')

console.log('List Servers Command:')
console.log(listServersCmd.build())
console.log()

// Example 2: Development Operations
console.log('📋 Example 2: Development Operations')
console.log('='.repeat(50))

// Create a project
const createProjectCmd = command('dev', 'project', 'create')
  .arg('name', 'my-enterprise-app')
  .arg('type', 'web')
  .option('framework', 'react')
  .option('database', 'postgresql')

console.log('Create Project Command:')
console.log(createProjectCmd.build())
console.log()

// Run tests
const runTestsCmd = resource('dev', 'test')
  .run()
  .arg('project', 'my-enterprise-app')
  .option('suite', 'integration')
  .option('coverage', true)

console.log('Run Tests Command:')
console.log(runTestsCmd.build())
console.log()

// Deploy application
const deployAppCmd = domain('dev')
  .resource('app')
  .deploy()
  .arg('project', 'my-enterprise-app')
  .arg('environment', 'staging')
  .option('region', 'us-east-1')
  .option('instances', 3)

console.log('Deploy Application Command:')
console.log(deployAppCmd.build())
console.log()

// Example 3: Security Management
console.log('📋 Example 3: Security Management')
console.log('='.repeat(50))

// Create user
const createUserCmd = command('security', 'user', 'create')
  .arg('name', 'john.doe')
  .arg('email', 'john.doe@company.com')
  .arg('role', 'developer')
  .option('department', 'engineering')
  .option('manager', 'jane.smith')

console.log('Create User Command:')
console.log(createUserCmd.build())
console.log()

// Audit user access
const auditUserCmd = resource('security', 'user')
  .audit()
  .arg('user', 'john.doe')
  .option('days', 30)
  .option('format', 'json')

console.log('Audit User Command:')
console.log(auditUserCmd.build())
console.log()

// Validate policy
const validatePolicyCmd = domain('security')
  .resource('policy')
  .validate()
  .arg('policy', 'rbac')
  .arg('user', 'john.doe')
  .option('strict', true)

console.log('Validate Policy Command:')
console.log(validatePolicyCmd.build())
console.log()

// Example 4: Cross-Domain Workflow
console.log('📋 Example 4: Cross-Domain Workflow')
console.log('='.repeat(50))

console.log('Enterprise Deployment Workflow:')
console.log('1. Create infrastructure')
console.log('2. Deploy application')
console.log('3. Setup monitoring')
console.log('4. Configure security')
console.log()

// Step 1: Create infrastructure
const step1Cmd = command('infra', 'server', 'create')
  .arg('type', 'web')
  .arg('region', 'us-east-1')
  .option('size', 'large')
  .option('count', 3)

console.log('Step 1 - Create Infrastructure:')
console.log(step1Cmd.build())
console.log()

// Step 2: Deploy application
const step2Cmd = command('dev', 'app', 'deploy')
  .arg('project', 'my-enterprise-app')
  .arg('environment', 'production')
  .option('region', 'us-east-1')
  .option('instances', 3)

console.log('Step 2 - Deploy Application:')
console.log(step2Cmd.build())
console.log()

// Step 3: Setup monitoring
const step3Cmd = command('monitor', 'alert', 'create')
  .arg('resource', 'web-server-001')
  .arg('metric', 'cpu')
  .arg('threshold', '80')
  .option('severity', 'warning')
  .option('notification', 'email')

console.log('Step 3 - Setup Monitoring:')
console.log(step3Cmd.build())
console.log()

// Step 4: Configure security
const step4Cmd = command('security', 'policy', 'create')
  .arg('name', 'production-access')
  .arg('resource', 'web-server-001')
  .arg('action', 'access')
  .option('users', 'admin,developer')
  .option('time', 'business-hours')

console.log('Step 4 - Configure Security:')
console.log(step4Cmd.build())
console.log()

// Example 5: Enterprise Context
console.log('📋 Example 5: Enterprise Context')
console.log('='.repeat(50))

// Set enterprise context
const enterpriseContext = {
  project: 'enterprise-prod',
  environment: 'production',
  region: 'us-east-1',
  compliance: 'sox',
  user: 'admin',
  role: 'admin',
}

console.log('Enterprise Context:')
console.log(JSON.stringify(enterpriseContext, null, 2))
console.log()

// Command with enterprise context
const contextualCmd = command('infra', 'server', 'create')
  .arg('type', 'web')
  .context(enterpriseContext)

console.log('Command with Enterprise Context:')
console.log(contextualCmd.build())
console.log()

console.log('✅ Enterprise Command Builder Demo Complete!')
console.log()
console.log('Key Features Demonstrated:')
console.log('• Domain-first approach: domain().resource().action()')
console.log('• Resource-first approach: resource(domain, resource).action()')
console.log('• Direct construction: command(domain, resource, action)')
console.log('• Fluent argument and option management')
console.log('• Enterprise context integration')
console.log('• Cross-domain workflow support')
console.log('• Fortune 500 enterprise patterns')
