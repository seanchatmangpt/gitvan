// enterprise-examples.js - Enterprise Noun-Verb CLI Testing Examples
// Demonstrates the comprehensive capabilities of the enterprise framework

/**
 * Enterprise Noun-Verb CLI Testing Framework Examples
 * Shows how to use the framework for complex enterprise CLI testing scenarios
 */

import {
  // Core framework
  runLocalCitty,
  runCitty,
  
  // Enterprise components
  command,
  cmd,
  infra,
  dev,
  security,
  monitor,
  data,
  compliance,
  
  // Domain registry
  domainRegistry,
  initializeDefaultRegistry,
  
  // Enhanced runner
  enterpriseRunner,
  pipeline,
  
  // Enterprise scenarios
  enterpriseScenario,
  workflow,
  compliance as complianceScenario,
  enterpriseScenarios,
  crossDomainWorkflows,
  
  // Enterprise assertions
  EnterpriseAssertions,
  
  // Enterprise test utils
  enterpriseTestUtils,
  testUtils
} from './index.js'

// Initialize the framework
initializeDefaultRegistry()

// Example 1: Basic Domain Commands
export async function basicDomainCommands() {
  console.log('=== Basic Domain Commands ===')
  
  // Infrastructure domain - server creation
  const serverResult = await runLocalCitty(['infra', 'server', 'create', '--type', 'web', '--region', 'us-east-1'])
  serverResult
    .expectSuccess()
    .expectResourceCreated('infra', 'server', 'web-server-001')
    .expectOutputContains('Server created successfully')
  
  // Development domain - project creation
  const projectResult = await runLocalCitty(['dev', 'project', 'create', '--name', 'my-app', '--type', 'web'])
  projectResult
    .expectSuccess()
    .expectResourceCreated('dev', 'project', 'my-app')
    .expectOutputContains('Project created successfully')
  
  // Security domain - user creation
  const userResult = await runLocalCitty(['security', 'user', 'create', '--name', 'john.doe', '--role', 'developer'])
  userResult
    .expectSuccess()
    .expectResourceCreated('security', 'user', 'john.doe')
    .expectOutputContains('User created successfully')
  
  console.log('✅ Basic domain commands completed successfully')
}

// Example 2: Fluent Command Builder
export async function fluentCommandBuilder() {
  console.log('=== Fluent Command Builder ===')
  
  // Domain-first approach
  const serverCmd = command('infra')
    .server()
    .create()
    .withType('web')
    .withRegion('us-east-1')
    .withSize('large')
  
  const serverResult = await serverCmd.execute('local')
  serverResult
    .expectSuccess()
    .expectResourceCreated('infra', 'server', 'web-server-002')
  
  // Resource-first approach
  const projectCmd = command()
    .domain('dev')
    .resource('project')
    .action('create')
    .arg('--name', 'enterprise-app')
    .arg('--type', 'web')
    .arg('--framework', 'react')
  
  const projectResult = await projectCmd.execute('local')
  projectResult
    .expectSuccess()
    .expectResourceCreated('dev', 'project', 'enterprise-app')
  
  // Convenience functions
  const networkResult = await infra()
    .network()
    .create()
    .withCidr('10.0.0.0/16')
    .withRegion('us-east-1')
    .execute('local')
  
  networkResult
    .expectSuccess()
    .expectResourceCreated('infra', 'network', 'network-001')
  
  console.log('✅ Fluent command builder completed successfully')
}

// Example 3: Cross-Domain Workflows
export async function crossDomainWorkflows() {
  console.log('=== Cross-Domain Workflows ===')
  
  // Application deployment workflow
  const deploymentWorkflow = await workflow('Application Deployment')
    .step('Create Project')
    .run(['dev', 'project', 'create', '--name', 'enterprise-app', '--type', 'web'])
    .build()
    
    .step('Run Tests')
    .run(['dev', 'test', 'run', '--project', 'enterprise-app', '--suite', 'integration'])
    .build()
    
    .step('Create Infrastructure')
    .run(['infra', 'server', 'create', '--type', 'web', '--region', 'us-east-1'])
    .build()
    
    .step('Deploy Application')
    .run(['dev', 'app', 'deploy', '--project', 'enterprise-app', '--server', 'web-server-001'])
    .build()
    
    .step('Setup Monitoring')
    .run(['monitor', 'alert', 'create', '--resource', 'web-server-001', '--metric', 'cpu'])
    .build()
    
    .execute('local')
  
  expect(deploymentWorkflow.success).toBe(true)
  expect(deploymentWorkflow.steps).toHaveLength(5)
  
  console.log('✅ Cross-domain workflow completed successfully')
}

// Example 4: Enterprise Context Management
export async function enterpriseContextManagement() {
  console.log('=== Enterprise Context Management ===')
  
  // Set enterprise context
  await testUtils.setContext({
    domain: 'infra',
    project: 'enterprise-prod',
    environment: 'staging',
    region: 'us-east-1',
    compliance: 'sox',
    user: 'admin',
    role: 'admin'
  })
  
  // Commands automatically include context
  const result = await runLocalCitty(['server', 'create', '--type', 'web'])
  // Automatically includes: --project enterprise-prod --env staging --region us-east-1
  
  result
    .expectSuccess()
    .expectEnterpriseContext({
      project: 'enterprise-prod',
      environment: 'staging',
      region: 'us-east-1'
    })
    .expectResourceCreated('infra', 'server', 'web-server-003')
  
  // Workspace management
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
  
  // Switch to workspace
  await testUtils.switchWorkspace('enterprise-prod')
  
  // Test workspace isolation
  const workspaceResult = await runLocalCitty(['server', 'list'])
  workspaceResult
    .expectSuccess()
    .expectWorkspaceIsolation('enterprise-prod')
    .expectOutputContains('enterprise-prod')
  
  console.log('✅ Enterprise context management completed successfully')
}

// Example 5: Resource Lifecycle Management
export async function resourceLifecycleManagement() {
  console.log('=== Resource Lifecycle Management ===')
  
  // Complete server lifecycle
  const serverLifecycle = await workflow('Server Lifecycle Management')
    .step('Create Server')
    .run(['infra', 'server', 'create', '--type', 'web', '--region', 'us-east-1', '--size', 'large'])
    .build()
    
    .step('Configure Server')
    .run(['infra', 'server', 'configure', '--id', 'web-server-004', '--security', 'strict'])
    .build()
    
    .step('Deploy Application')
    .run(['dev', 'app', 'deploy', '--server', 'web-server-004', '--app', 'my-app'])
    .build()
    
    .step('Setup Monitoring')
    .run(['monitor', 'alert', 'create', '--resource', 'web-server-004', '--metric', 'cpu', '--threshold', '80'])
    .build()
    
    .step('Create Backup')
    .run(['data', 'backup', 'create', '--resource', 'web-server-004', '--schedule', 'daily'])
    .build()
    
    .step('Scale Server')
    .run(['infra', 'server', 'scale', '--id', 'web-server-004', '--size', 'xlarge'])
    .build()
    
    .step('Delete Server')
    .run(['infra', 'server', 'delete', '--id', 'web-server-004', '--cleanup', 'true'])
    .build()
    
    .execute('local')
  
  expect(serverLifecycle.success).toBe(true)
  expect(serverLifecycle.steps).toHaveLength(7)
  
  console.log('✅ Resource lifecycle management completed successfully')
}

// Example 6: Compliance Testing
export async function complianceTesting() {
  console.log('=== Compliance Testing ===')
  
  // SOX compliance testing
  const soxCompliance = await complianceScenario('sox')
    .validate({
      domains: ['infra', 'security', 'data'],
      resources: ['server', 'user', 'database']
    })
    .audit(['infra', 'security'])
    .report('json')
    .execute('local')
  
  expect(soxCompliance.success).toBe(true)
  expect(soxCompliance.steps).toHaveLength(4)
  
  // GDPR compliance testing
  const gdprCompliance = await complianceScenario('gdpr')
    .validate({
      domains: ['data', 'security'],
      resources: ['user', 'policy']
    })
    .audit(['data', 'security'])
    .report('json')
    .execute('local')
  
  expect(gdprCompliance.success).toBe(true)
  expect(gdprCompliance.steps).toHaveLength(4)
  
  console.log('✅ Compliance testing completed successfully')
}

// Example 7: Enterprise Test Utilities
export async function enterpriseTestUtilities() {
  console.log('=== Enterprise Test Utilities ===')
  
  // Resource management
  const server = await testUtils.createResource('infra', 'server', {
    type: 'web',
    region: 'us-east-1',
    size: 'large'
  })
  
  expect(server.id).toBeDefined()
  expect(server.domain).toBe('infra')
  expect(server.type).toBe('server')
  
  // List resources
  const servers = await testUtils.listResources('infra', 'server', {
    region: 'us-east-1'
  })
  
  expect(servers.length).toBeGreaterThan(0)
  
  // Update resource
  const updatedServer = await testUtils.updateResource('infra', 'server', server.id, {
    size: 'xlarge'
  })
  
  expect(updatedServer.attributes.size).toBe('xlarge')
  
  // Cross-domain operations
  const deployment = await testUtils.deployApplication('enterprise-app', {
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
  
  expect(deployment.status).toBe('completed')
  expect(deployment.resources.length).toBeGreaterThan(0)
  
  // Compliance validation
  const complianceResult = await testUtils.validateCompliance('sox', {
    domains: ['infra', 'security', 'data'],
    resources: ['server', 'user', 'database']
  })
  
  expect(complianceResult.valid).toBe(true)
  expect(complianceResult.score).toBeGreaterThan(80)
  
  // Cleanup
  await testUtils.deleteResource('infra', 'server', server.id)
  
  console.log('✅ Enterprise test utilities completed successfully')
}

// Example 8: Pipeline Execution
export async function pipelineExecution() {
  console.log('=== Pipeline Execution ===')
  
  // Create a complex pipeline
  const deploymentPipeline = pipeline('Enterprise Deployment Pipeline')
    .description('Complete enterprise application deployment pipeline')
    
    .step('Create Project', ['dev', 'project', 'create', '--name', 'enterprise-app'], {
      timeout: 30000
    })
    
    .step('Run Tests', ['dev', 'test', 'run', '--project', 'enterprise-app'], {
      dependencies: ['Create Project'],
      timeout: 60000
    })
    
    .step('Create Infrastructure', ['infra', 'server', 'create', '--type', 'web'], {
      dependencies: ['Run Tests'],
      timeout: 120000
    })
    
    .step('Deploy Application', ['dev', 'app', 'deploy', '--project', 'enterprise-app'], {
      dependencies: ['Create Infrastructure'],
      timeout: 180000
    })
    
    .step('Setup Monitoring', ['monitor', 'alert', 'create', '--resource', 'web-server-001'], {
      dependencies: ['Deploy Application'],
      timeout: 30000
    })
    
    .step('Health Check', ['monitor', 'health', 'check', '--resource', 'web-server-001'], {
      dependencies: ['Setup Monitoring'],
      timeout: 30000,
      retryPolicy: {
        maxAttempts: 3,
        delay: 5000,
        backoff: 'exponential'
      }
    })
  
  // Execute pipeline
  const pipelineResult = await deploymentPipeline.execute('local', {
    validateDependencies: true,
    stopOnError: true,
    timeout: 600000
  })
  
  expect(pipelineResult.success).toBe(true)
  expect(pipelineResult.steps).toHaveLength(6)
  expect(pipelineResult.duration).toBeLessThan(600000)
  
  console.log('✅ Pipeline execution completed successfully')
}

// Example 9: Enterprise Scenarios
export async function enterpriseScenariosExample() {
  console.log('=== Enterprise Scenarios ===')
  
  // Infrastructure scenarios
  const createServerResult = await enterpriseScenarios.infra.server.create('local').execute()
  expect(createServerResult.success).toBe(true)
  expect(createServerResult.result.stdout).toContain('Server created successfully')
  
  const listServersResult = await enterpriseScenarios.infra.server.list('cleanroom').execute()
  expect(listServersResult.success).toBe(true)
  expect(listServersResult.result.stdout).toContain('Server list')
  
  // Development scenarios
  const createProjectResult = await enterpriseScenarios.dev.project.create('local').execute()
  expect(createProjectResult.success).toBe(true)
  expect(createProjectResult.result.stdout).toContain('Project created successfully')
  
  const runTestsResult = await enterpriseScenarios.dev.test.run('local').execute()
  expect(runTestsResult.success).toBe(true)
  expect(runTestsResult.result.stdout).toContain('All tests passed')
  
  // Security scenarios
  const createUserResult = await enterpriseScenarios.security.user.create('local').execute()
  expect(createUserResult.success).toBe(true)
  expect(createUserResult.result.stdout).toContain('User created successfully')
  
  const auditUserResult = await enterpriseScenarios.security.user.audit('cleanroom').execute()
  expect(auditUserResult.success).toBe(true)
  expect(auditUserResult.result.stdout).toContain('User audit completed')
  
  console.log('✅ Enterprise scenarios completed successfully')
}

// Example 10: Cross-Domain Workflows
export async function crossDomainWorkflowsExample() {
  console.log('=== Cross-Domain Workflows ===')
  
  // Deployment workflow
  const deploymentWorkflow = crossDomainWorkflows.deployment()
  const deploymentResult = await deploymentWorkflow.execute('local')
  expect(deploymentResult.success).toBe(true)
  expect(deploymentResult.steps).toHaveLength(5)
  
  // SOX compliance workflow
  const soxWorkflow = crossDomainWorkflows.compliance.sox()
  const soxResult = await soxWorkflow.execute('cleanroom')
  expect(soxResult.success).toBe(true)
  expect(soxResult.steps).toHaveLength(4)
  
  // GDPR compliance workflow
  const gdprWorkflow = crossDomainWorkflows.compliance.gdpr()
  const gdprResult = await gdprWorkflow.execute('local')
  expect(gdprResult.success).toBe(true)
  expect(gdprResult.steps).toHaveLength(4)
  
  console.log('✅ Cross-domain workflows completed successfully')
}

// Main function to run all examples
export async function runAllExamples() {
  console.log('🚀 Starting Enterprise Noun-Verb CLI Testing Framework Examples')
  console.log('=' * 60)
  
  try {
    await basicDomainCommands()
    await fluentCommandBuilder()
    await crossDomainWorkflows()
    await enterpriseContextManagement()
    await resourceLifecycleManagement()
    await complianceTesting()
    await enterpriseTestUtilities()
    await pipelineExecution()
    await enterpriseScenariosExample()
    await crossDomainWorkflowsExample()
    
    console.log('=' * 60)
    console.log('🎉 All examples completed successfully!')
    console.log('✅ Enterprise Noun-Verb CLI Testing Framework is ready for production use')
  } catch (error) {
    console.error('❌ Example failed:', error.message)
    throw error
  }
}

// Export all examples
export default {
  basicDomainCommands,
  fluentCommandBuilder,
  crossDomainWorkflows,
  enterpriseContextManagement,
  resourceLifecycleManagement,
  complianceTesting,
  enterpriseTestUtilities,
  pipelineExecution,
  enterpriseScenariosExample,
  crossDomainWorkflowsExample,
  runAllExamples
}
