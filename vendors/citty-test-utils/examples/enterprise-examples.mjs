/**
 * Enterprise Examples and Use Cases
 * 
 * Comprehensive examples demonstrating enterprise noun-verb CLI testing
 * patterns, cross-domain workflows, and compliance testing scenarios.
 */

import { 
  enterpriseRunner,
  enterpriseUtils,
  enterpriseScenarios,
  scenarioUtils,
  enterpriseTestUtils,
  testUtils,
  globalContextManager,
  contextUtils
} from '../index.js'

/**
 * Basic Enterprise Command Examples
 */

// Example 1: Infrastructure Domain Commands
export async function infrastructureExamples() {
  console.log('=== Infrastructure Domain Examples ===')

  // Create server using fluent command builder
  const serverResult = await enterpriseUtils.infra()
    .server()
    .create()
    .arg('--type', 'web')
    .arg('--region', 'us-east-1')
    .arg('--size', 'large')
    .execute(enterpriseRunner)

  console.log('Server created:', serverResult.success)

  // List servers
  const listResult = await enterpriseUtils.infra()
    .server()
    .list()
    .arg('--region', 'us-east-1')
    .execute(enterpriseRunner)

  console.log('Servers listed:', listResult.success)

  // Show server details
  const showResult = await enterpriseUtils.infra()
    .server()
    .show()
    .arg('--id', 'web-server-001')
    .execute(enterpriseRunner)

  console.log('Server details:', showResult.success)
}

// Example 2: Development Domain Commands
export async function developmentExamples() {
  console.log('=== Development Domain Examples ===')

  // Create project
  const projectResult = await enterpriseUtils.dev()
    .project()
    .create()
    .arg('--name', 'my-app')
    .arg('--type', 'web')
    .execute(enterpriseRunner)

  console.log('Project created:', projectResult.success)

  // Run tests
  const testResult = await enterpriseUtils.dev()
    .test()
    .run()
    .arg('--project', 'my-app')
    .arg('--suite', 'integration')
    .execute(enterpriseRunner)

  console.log('Tests run:', testResult.success)

  // Deploy application
  const deployResult = await enterpriseUtils.dev()
    .project()
    .deploy()
    .arg('--project', 'my-app')
    .arg('--environment', 'staging')
    .execute(enterpriseRunner)

  console.log('Application deployed:', deployResult.success)
}

// Example 3: Security Domain Commands
export async function securityExamples() {
  console.log('=== Security Domain Examples ===')

  // Create user
  const userResult = await enterpriseUtils.security()
    .user()
    .create()
    .arg('--name', 'john.doe')
    .arg('--email', 'john@company.com')
    .arg('--role', 'developer')
    .execute(enterpriseRunner)

  console.log('User created:', userResult.success)

  // Validate policy
  const policyResult = await enterpriseUtils.security()
    .policy()
    .validate()
    .arg('--policy', 'rbac')
    .arg('--user', 'john.doe')
    .execute(enterpriseRunner)

  console.log('Policy validated:', policyResult.success)

  // Audit user access
  const auditResult = await enterpriseUtils.security()
    .user()
    .audit()
    .arg('--user', 'john.doe')
    .arg('--days', '30')
    .execute(enterpriseRunner)

  console.log('User audited:', auditResult.success)
}

/**
 * Cross-Domain Workflow Examples
 */

// Example 4: Application Deployment Workflow
export async function deploymentWorkflowExample() {
  console.log('=== Application Deployment Workflow ===')

  const workflow = await scenarioUtils.workflow('Application Deployment')
    .step('Create Project')
    .run({
      domain: 'dev',
      resource: 'project',
      action: 'create',
      args: { name: 'my-app', type: 'web' },
      options: {}
    })
    .expectSuccess()
    .expectResourceCreated('dev', 'project', 'my-app')
    
    .step('Run Tests')
    .run({
      domain: 'dev',
      resource: 'test',
      action: 'run',
      args: { project: 'my-app', suite: 'integration' },
      options: {}
    })
    .expectSuccess()
    .expectOutput('All tests passed')
    
    .step('Create Infrastructure')
    .run({
      domain: 'infra',
      resource: 'server',
      action: 'create',
      args: { type: 'web', region: 'us-east-1' },
      options: {}
    })
    .expectSuccess()
    .expectResourceCreated('infra', 'server', 'web-server-001')
    
    .step('Deploy Application')
    .run({
      domain: 'dev',
      resource: 'project',
      action: 'deploy',
      args: { project: 'my-app', server: 'web-server-001' },
      options: {}
    })
    .expectSuccess()
    .expectOutput('Deployment successful')
    
    .step('Setup Monitoring')
    .run({
      domain: 'monitor',
      resource: 'alert',
      action: 'create',
      args: { resource: 'web-server-001', metric: 'cpu' },
      options: {}
    })
    .expectSuccess()
    .expectResourceCreated('monitor', 'alert', 'cpu-alert-001')
    
    .execute('local')

  console.log('Deployment workflow completed:', workflow.success)
  console.log('Steps executed:', workflow.steps.length)
}

// Example 5: Compliance Validation Workflow
export async function complianceWorkflowExample() {
  console.log('=== Compliance Validation Workflow ===')

  const complianceWorkflow = await scenarioUtils.workflow('SOX Compliance Validation')
    .step('User Access Audit')
    .run({
      domain: 'security',
      resource: 'user',
      action: 'audit',
      args: { standard: 'sox' },
      options: {}
    })
    .expectSuccess()
    .expectComplianceValidated('sox')
    
    .step('Policy Validation')
    .run({
      domain: 'security',
      resource: 'policy',
      action: 'validate',
      args: { standard: 'sox' },
      options: {}
    })
    .expectSuccess()
    .expectPolicyEnforced('sox')
    
    .step('Infrastructure Audit')
    .run({
      domain: 'infra',
      resource: 'server',
      action: 'audit',
      args: { standard: 'sox' },
      options: {}
    })
    .expectSuccess()
    .expectComplianceValidated('sox')
    
    .step('Generate Compliance Report')
    .run({
      domain: 'compliance',
      resource: 'report',
      action: 'generate',
      args: { standard: 'sox', format: 'json' },
      options: {}
    })
    .expectSuccess()
    .expectOutput('Compliance report generated')
    
    .execute('cleanroom')

  console.log('Compliance workflow completed:', complianceWorkflow.success)
  console.log('Steps executed:', complianceWorkflow.steps.length)
}

/**
 * Enterprise Context Management Examples
 */

// Example 6: Context-Aware Testing
export async function contextAwareTestingExample() {
  console.log('=== Context-Aware Testing ===')

  // Set enterprise context
  await contextUtils.setContext({
    domain: 'infra',
    project: 'enterprise-prod',
    environment: 'staging',
    region: 'us-east-1',
    compliance: 'sox',
    user: 'admin',
    role: 'admin'
  })

  // Commands automatically include context
  const result = await enterpriseRunner.executeDomain(
    'infra',
    'server',
    'create',
    ['--type', 'web']
  )

  console.log('Context-aware command executed:', result.success)
  console.log('Context included:', result.result.stdout.includes('enterprise-prod'))
}

// Example 7: Workspace Management
export async function workspaceManagementExample() {
  console.log('=== Workspace Management ===')

  // Create enterprise workspace
  const workspace = await testUtils.createWorkspace('enterprise-prod', {
    name: 'Enterprise Production',
    description: 'Production environment for enterprise applications',
    domains: ['infra', 'dev', 'security', 'monitor'],
    resources: ['server', 'project', 'user', 'alert'],
    permissions: [
      { resource: 'server', actions: ['create', 'list', 'show', 'update', 'delete'] },
      { resource: 'project', actions: ['create', 'list', 'show', 'deploy'] },
      { resource: 'user', actions: ['create', 'list', 'show', 'audit'] },
      { resource: 'alert', actions: ['create', 'list', 'show', 'update'] }
    ]
  })

  console.log('Workspace created:', workspace.name)

  // Switch to workspace
  await testUtils.switchWorkspace('enterprise-prod')

  // Test workspace isolation
  const result = await enterpriseRunner.executeDomain(
    'infra',
    'server',
    'list',
    []
  )

  console.log('Workspace isolation test:', result.success)
  console.log('Workspace context applied:', result.result.stdout.includes('enterprise-prod'))
}

/**
 * Resource Management Examples
 */

// Example 8: Resource Lifecycle Management
export async function resourceLifecycleExample() {
  console.log('=== Resource Lifecycle Management ===')

  // Create server resource
  const server = await testUtils.createResource('infra', 'server', {
    type: 'web',
    region: 'us-east-1',
    size: 'large'
  })

  console.log('Server created:', server.id)

  // Update server resource
  const updatedServer = await testUtils.updateResource('infra', 'server', server.id, {
    size: 'xlarge'
  })

  console.log('Server updated:', updatedServer.id)

  // List server resources
  const servers = await testUtils.listResources('infra', 'server', {
    region: 'us-east-1'
  })

  console.log('Servers found:', servers.length)

  // Delete server resource
  await testUtils.deleteResource('infra', 'server', server.id)

  console.log('Server deleted:', server.id)
}

// Example 9: Cross-Domain Resource Operations
export async function crossDomainResourceExample() {
  console.log('=== Cross-Domain Resource Operations ===')

  // Deploy application with cross-domain resources
  const deployment = await testUtils.deployApplication('my-app', {
    infra: {
      servers: 3,
      region: 'us-east-1',
      type: 'web'
    },
    security: {
      policies: ['rbac', 'encryption'],
      users: ['admin', 'developer']
    },
    monitor: {
      alerts: ['cpu', 'memory', 'disk'],
      dashboard: 'prod-overview'
    }
  })

  console.log('Deployment completed:', deployment.success)
  console.log('Resources created:', deployment.resources.length)
  console.log('Deployment duration:', deployment.duration, 'ms')
}

/**
 * Compliance Testing Examples
 */

// Example 10: SOX Compliance Testing
export async function soxComplianceExample() {
  console.log('=== SOX Compliance Testing ===')

  const soxCompliance = await scenarioUtils.compliance('sox')
    .validate({
      domains: ['infra', 'security', 'data'],
      resources: ['server', 'user', 'database'],
      standards: ['sox']
    })
    .audit(['infra', 'security'])
    .report('json')
    .execute()

  console.log('SOX compliance completed:', soxCompliance.success)
  console.log('Compliance score:', soxCompliance.score)
  console.log('Violations found:', soxCompliance.violations.length)
}

// Example 11: GDPR Compliance Testing
export async function gdprComplianceExample() {
  console.log('=== GDPR Compliance Testing ===')

  const gdprCompliance = await scenarioUtils.compliance('gdpr')
    .validate({
      domains: ['data', 'security'],
      resources: ['database', 'user'],
      standards: ['gdpr']
    })
    .audit(['data', 'security'])
    .report('json')
    .execute()

  console.log('GDPR compliance completed:', gdprCompliance.success)
  console.log('Compliance score:', gdprCompliance.score)
  console.log('Violations found:', gdprCompliance.violations.length)
}

/**
 * Performance Testing Examples
 */

// Example 12: Server Performance Testing
export async function performanceTestingExample() {
  console.log('=== Performance Testing ===')

  const performanceTest = await scenarioUtils.workflow('Server Performance Testing')
    .step('Create Server')
    .run({
      domain: 'infra',
      resource: 'server',
      action: 'create',
      args: { type: 'web', region: 'us-east-1' },
      options: {}
    })
    .expectSuccess()
    .expectResourceCreated('infra', 'server', 'web-server-001')
    
    .step('Deploy Application')
    .run({
      domain: 'dev',
      resource: 'project',
      action: 'deploy',
      args: { server: 'web-server-001', app: 'my-app' },
      options: {}
    })
    .expectSuccess()
    .expectOutput('Application deployed successfully')
    
    .step('Load Test')
    .run({
      domain: 'monitor',
      resource: 'load',
      action: 'test',
      args: { server: 'web-server-001', duration: '300', users: '100' },
      options: {}
    })
    .expectSuccess()
    .expectOutput('Load test completed')
    
    .execute('local')

  console.log('Performance test completed:', performanceTest.success)
  console.log('Steps executed:', performanceTest.steps.length)
}

/**
 * Enterprise Use Cases
 */

// Example 13: Multi-Tenant Application Testing
export async function multiTenantTestingExample() {
  console.log('=== Multi-Tenant Testing ===')

  const tenantIsolation = await scenarioUtils.workflow('Multi-Tenant Isolation Testing')
    .step('Create Tenant A')
    .run({
      domain: 'tenant',
      resource: 'tenant',
      action: 'create',
      args: { name: 'tenant-a', domain: 'tenant-a.com' },
      options: {}
    })
    .expectSuccess()
    .expectResourceCreated('tenant', 'tenant', 'tenant-a')
    
    .step('Create Tenant B')
    .run({
      domain: 'tenant',
      resource: 'tenant',
      action: 'create',
      args: { name: 'tenant-b', domain: 'tenant-b.com' },
      options: {}
    })
    .expectSuccess()
    .expectResourceCreated('tenant', 'tenant', 'tenant-b')
    
    .step('Create Resources for Tenant A')
    .run({
      domain: 'infra',
      resource: 'server',
      action: 'create',
      args: { tenant: 'tenant-a', type: 'web' },
      options: {}
    })
    .expectSuccess()
    .expectResourceCreated('infra', 'server', 'tenant-a-server-001')
    
    .step('Verify Tenant A Isolation')
    .run({
      domain: 'infra',
      resource: 'server',
      action: 'list',
      args: { tenant: 'tenant-a' },
      options: {}
    })
    .expectSuccess()
    .expectOutputContains('tenant-a-server-001')
    .expectOutputNotContains('tenant-b-server-001')
    
    .execute('local')

  console.log('Multi-tenant isolation test completed:', tenantIsolation.success)
  console.log('Steps executed:', tenantIsolation.steps.length)
}

// Example 14: Disaster Recovery Testing
export async function disasterRecoveryExample() {
  console.log('=== Disaster Recovery Testing ===')

  const disasterRecovery = await scenarioUtils.workflow('Disaster Recovery Testing')
    .step('Create Primary Server')
    .run({
      domain: 'infra',
      resource: 'server',
      action: 'create',
      args: { type: 'web', region: 'us-east-1', name: 'primary-server' },
      options: {}
    })
    .expectSuccess()
    .expectResourceCreated('infra', 'server', 'primary-server')
    
    .step('Deploy Application')
    .run({
      domain: 'dev',
      resource: 'project',
      action: 'deploy',
      args: { server: 'primary-server', app: 'my-app' },
      options: {}
    })
    .expectSuccess()
    .expectOutput('Application deployed successfully')
    
    .step('Create Backup')
    .run({
      domain: 'data',
      resource: 'backup',
      action: 'create',
      args: { resource: 'primary-server', schedule: 'daily' },
      options: {}
    })
    .expectSuccess()
    .expectResourceCreated('data', 'backup', 'backup-001')
    
    .step('Simulate Disaster')
    .run({
      domain: 'infra',
      resource: 'server',
      action: 'delete',
      args: { id: 'primary-server', 'simulate-disaster': 'true' },
      options: {}
    })
    .expectSuccess()
    .expectResourceDeleted('infra', 'server', 'primary-server')
    
    .step('Create Recovery Server')
    .run({
      domain: 'infra',
      resource: 'server',
      action: 'create',
      args: { type: 'web', region: 'us-west-2', name: 'recovery-server' },
      options: {}
    })
    .expectSuccess()
    .expectResourceCreated('infra', 'server', 'recovery-server')
    
    .step('Restore from Backup')
    .run({
      domain: 'data',
      resource: 'backup',
      action: 'restore',
      args: { backup: 'backup-001', server: 'recovery-server' },
      options: {}
    })
    .expectSuccess()
    .expectOutput('Backup restored successfully')
    
    .execute('cleanroom')

  console.log('Disaster recovery test completed:', disasterRecovery.success)
  console.log('Steps executed:', disasterRecovery.steps.length)
}

/**
 * Run All Examples
 */
export async function runAllExamples() {
  console.log('🚀 Running Enterprise Noun-Verb CLI Testing Examples\n')

  try {
    await infrastructureExamples()
    await developmentExamples()
    await securityExamples()
    await deploymentWorkflowExample()
    await complianceWorkflowExample()
    await contextAwareTestingExample()
    await workspaceManagementExample()
    await resourceLifecycleExample()
    await crossDomainResourceExample()
    await soxComplianceExample()
    await gdprComplianceExample()
    await performanceTestingExample()
    await multiTenantTestingExample()
    await disasterRecoveryExample()

    console.log('\n✅ All enterprise examples completed successfully!')
  } catch (error) {
    console.error('\n❌ Error running examples:', error.message)
  }
}

export default {
  infrastructureExamples,
  developmentExamples,
  securityExamples,
  deploymentWorkflowExample,
  complianceWorkflowExample,
  contextAwareTestingExample,
  workspaceManagementExample,
  resourceLifecycleExample,
  crossDomainResourceExample,
  soxComplianceExample,
  gdprComplianceExample,
  performanceTestingExample,
  multiTenantTestingExample,
  disasterRecoveryExample,
  runAllExamples
}
