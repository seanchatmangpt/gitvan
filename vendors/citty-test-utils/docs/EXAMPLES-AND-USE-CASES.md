# Enterprise Noun-Verb CLI Testing Framework - Examples and Use Cases

## Overview

This document provides comprehensive examples and use cases for the enterprise noun-verb CLI testing framework, demonstrating how to test complex enterprise CLI applications with multiple domains, resources, and cross-domain workflows.

## Basic Examples

### 1. Simple Domain Commands

#### **Infrastructure Domain**
```javascript
import { runLocalCitty, scenarios } from 'citty-test-utils'

// Test server creation
const result = await runLocalCitty(['infra', 'server', 'create', '--type', 'web', '--region', 'us-east-1'])
result
  .expectSuccess()
  .expectResourceCreated('infra', 'server', 'web-server-001')
  .expectOutputContains('Server created successfully')

// Test server listing
const listResult = await runLocalCitty(['infra', 'server', 'list', '--region', 'us-east-1'])
listResult
  .expectSuccess()
  .expectResourceCount('infra', 'server', 1)
  .expectOutputContains('web-server-001')

// Test server deletion
const deleteResult = await runLocalCitty(['infra', 'server', 'delete', 'web-server-001'])
deleteResult
  .expectSuccess()
  .expectResourceDeleted('infra', 'server', 'web-server-001')
```

#### **Development Domain**
```javascript
// Test project creation
const projectResult = await runLocalCitty(['dev', 'project', 'create', '--name', 'my-app', '--type', 'web'])
projectResult
  .expectSuccess()
  .expectResourceCreated('dev', 'project', 'my-app')
  .expectOutputContains('Project created successfully')

// Test test execution
const testResult = await runLocalCitty(['dev', 'test', 'run', '--project', 'my-app', '--suite', 'integration'])
testResult
  .expectSuccess()
  .expectOutputContains('All tests passed')
  .expectDuration(30000) // 30 seconds max

// Test deployment
const deployResult = await runLocalCitty(['dev', 'app', 'deploy', '--project', 'my-app', '--environment', 'staging'])
deployResult
  .expectSuccess()
  .expectOutputContains('Deployment successful')
```

#### **Security Domain**
```javascript
// Test user creation
const userResult = await runLocalCitty(['security', 'user', 'create', '--name', 'john.doe', '--role', 'developer'])
userResult
  .expectSuccess()
  .expectResourceCreated('security', 'user', 'john.doe')
  .expectOutputContains('User created successfully')

// Test policy validation
const policyResult = await runLocalCitty(['security', 'policy', 'validate', '--policy', 'rbac', '--user', 'john.doe'])
policyResult
  .expectSuccess()
  .expectPolicyEnforced('rbac')
  .expectOutputContains('Policy validation successful')

// Test audit logging
const auditResult = await runLocalCitty(['security', 'audit', 'list', '--user', 'john.doe', '--days', '7'])
auditResult
  .expectSuccess()
  .expectAuditLog('create', 'user', 'john.doe')
  .expectOutputContains('Audit log entries found')
```

### 2. Cross-Domain Workflows

#### **Application Deployment Workflow**
```javascript
import { scenario } from 'citty-test-utils'

const deploymentWorkflow = await scenario('Application Deployment')
  .step('Create Project')
  .run(['dev', 'project', 'create', '--name', 'my-app', '--type', 'web'])
  .expectSuccess()
  .expectResourceCreated('dev', 'project', 'my-app')
  
  .step('Run Tests')
  .run(['dev', 'test', 'run', '--project', 'my-app', '--suite', 'integration'])
  .expectSuccess()
  .expectOutputContains('All tests passed')
  
  .step('Create Infrastructure')
  .run(['infra', 'server', 'create', '--type', 'web', '--region', 'us-east-1'])
  .expectSuccess()
  .expectResourceCreated('infra', 'server', 'web-server-001')
  
  .step('Deploy Application')
  .run(['dev', 'app', 'deploy', '--project', 'my-app', '--server', 'web-server-001'])
  .expectSuccess()
  .expectOutputContains('Deployment successful')
  
  .step('Setup Monitoring')
  .run(['monitor', 'alert', 'create', '--resource', 'web-server-001', '--metric', 'cpu'])
  .expectSuccess()
  .expectResourceCreated('monitor', 'alert', 'cpu-alert-001')
  
  .execute('local')

expect(deploymentWorkflow.success).toBe(true)
expect(deploymentWorkflow.steps).toHaveLength(5)
```

#### **Compliance Validation Workflow**
```javascript
const complianceWorkflow = await scenario('SOX Compliance Validation')
  .step('User Access Audit')
  .run(['security', 'user', 'audit', '--standard', 'sox'])
  .expectSuccess()
  .expectComplianceValidated('sox')
  
  .step('Policy Validation')
  .run(['security', 'policy', 'validate', '--standard', 'sox'])
  .expectSuccess()
  .expectPolicyEnforced('sox')
  
  .step('Infrastructure Audit')
  .run(['infra', 'server', 'audit', '--standard', 'sox'])
  .expectSuccess()
  .expectComplianceValidated('sox')
  
  .step('Data Backup Validation')
  .run(['data', 'backup', 'validate', '--standard', 'sox'])
  .expectSuccess()
  .expectComplianceValidated('sox')
  
  .step('Generate Compliance Report')
  .run(['compliance', 'report', 'generate', '--standard', 'sox', '--format', 'json'])
  .expectSuccess()
  .expectJson(data => {
    expect(data.standard).toBe('sox')
    expect(data.score).toBeGreaterThan(90)
    expect(data.valid).toBe(true)
  })
  
  .execute('cleanroom')

expect(complianceWorkflow.success).toBe(true)
expect(complianceWorkflow.steps).toHaveLength(5)
```

### 3. Enterprise Context Management

#### **Context-Aware Testing**
```javascript
import { testUtils } from 'citty-test-utils'

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
  .expectResourceCreated('infra', 'server', 'web-server-001')
```

#### **Workspace Management**
```javascript
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

// Switch to workspace
await testUtils.switchWorkspace('enterprise-prod')

// Test workspace isolation
const result = await runLocalCitty(['server', 'list'])
result
  .expectSuccess()
  .expectWorkspaceIsolation('enterprise-prod')
  .expectOutputContains('enterprise-prod')
```

## Advanced Examples

### 1. Resource Lifecycle Management

#### **Complete Server Lifecycle**
```javascript
const serverLifecycle = await scenario('Server Lifecycle Management')
  .step('Create Server')
  .run(['infra', 'server', 'create', '--type', 'web', '--region', 'us-east-1', '--size', 'large'])
  .expectSuccess()
  .expectResourceCreated('infra', 'server', 'web-server-001')
  
  .step('Configure Server')
  .run(['infra', 'server', 'configure', '--id', 'web-server-001', '--security', 'strict'])
  .expectSuccess()
  .expectResourceUpdated('infra', 'server', 'web-server-001')
  
  .step('Deploy Application')
  .run(['dev', 'app', 'deploy', '--server', 'web-server-001', '--app', 'my-app'])
  .expectSuccess()
  .expectOutputContains('Application deployed successfully')
  
  .step('Setup Monitoring')
  .run(['monitor', 'alert', 'create', '--resource', 'web-server-001', '--metric', 'cpu', '--threshold', '80'])
  .expectSuccess()
  .expectResourceCreated('monitor', 'alert', 'cpu-alert-001')
  
  .step('Create Backup')
  .run(['data', 'backup', 'create', '--resource', 'web-server-001', '--schedule', 'daily'])
  .expectSuccess()
  .expectResourceCreated('data', 'backup', 'backup-001')
  
  .step('Scale Server')
  .run(['infra', 'server', 'scale', '--id', 'web-server-001', '--size', 'xlarge'])
  .expectSuccess()
  .expectResourceUpdated('infra', 'server', 'web-server-001')
  
  .step('Delete Server')
  .run(['infra', 'server', 'delete', '--id', 'web-server-001', '--cleanup', 'true'])
  .expectSuccess()
  .expectResourceDeleted('infra', 'server', 'web-server-001')
  
  .execute('local')

expect(serverLifecycle.success).toBe(true)
expect(serverLifecycle.steps).toHaveLength(7)
```

#### **User Management Lifecycle**
```javascript
const userLifecycle = await scenario('User Management Lifecycle')
  .step('Create User')
  .run(['security', 'user', 'create', '--name', 'john.doe', '--email', 'john@company.com', '--role', 'developer'])
  .expectSuccess()
  .expectResourceCreated('security', 'user', 'john.doe')
  
  .step('Assign Role')
  .run(['security', 'role', 'assign', '--user', 'john.doe', '--role', 'developer'])
  .expectSuccess()
  .expectResourceUpdated('security', 'user', 'john.doe')
  
  .step('Validate Permissions')
  .run(['security', 'policy', 'validate', '--user', 'john.doe', '--policy', 'rbac'])
  .expectSuccess()
  .expectPolicyEnforced('rbac')
  
  .step('Audit User Access')
  .run(['security', 'audit', 'user', '--user', 'john.doe', '--days', '30'])
  .expectSuccess()
  .expectAuditLog('create', 'user', 'john.doe')
  
  .step('Update User')
  .run(['security', 'user', 'update', '--id', 'john.doe', '--role', 'senior-developer'])
  .expectSuccess()
  .expectResourceUpdated('security', 'user', 'john.doe')
  
  .step('Deactivate User')
  .run(['security', 'user', 'deactivate', '--id', 'john.doe'])
  .expectSuccess()
  .expectResourceUpdated('security', 'user', 'john.doe')
  
  .execute('cleanroom')

expect(userLifecycle.success).toBe(true)
expect(userLifecycle.steps).toHaveLength(6)
```

### 2. Compliance Testing Examples

#### **SOX Compliance Testing**
```javascript
const soxCompliance = await scenario('SOX Compliance Testing')
  .step('User Access Controls')
  .run(['security', 'user', 'audit', '--standard', 'sox'])
  .expectSuccess()
  .expectComplianceValidated('sox')
  .expectOutputContains('User access controls validated')
  
  .step('Data Backup Procedures')
  .run(['data', 'backup', 'validate', '--standard', 'sox'])
  .expectSuccess()
  .expectComplianceValidated('sox')
  .expectOutputContains('Backup procedures validated')
  
  .step('Infrastructure Security')
  .run(['infra', 'security', 'audit', '--standard', 'sox'])
  .expectSuccess()
  .expectComplianceValidated('sox')
  .expectOutputContains('Infrastructure security validated')
  
  .step('Generate SOX Report')
  .run(['compliance', 'report', 'generate', '--standard', 'sox', '--format', 'json'])
  .expectSuccess()
  .expectJson(data => {
    expect(data.standard).toBe('sox')
    expect(data.score).toBeGreaterThan(90)
    expect(data.valid).toBe(true)
    expect(data.violations).toHaveLength(0)
  })
  
  .execute('local')

expect(soxCompliance.success).toBe(true)
expect(soxCompliance.steps).toHaveLength(4)
```

#### **GDPR Compliance Testing**
```javascript
const gdprCompliance = await scenario('GDPR Compliance Testing')
  .step('Data Privacy Controls')
  .run(['data', 'privacy', 'audit', '--standard', 'gdpr'])
  .expectSuccess()
  .expectComplianceValidated('gdpr')
  .expectOutputContains('Data privacy controls validated')
  
  .step('User Consent Management')
  .run(['security', 'consent', 'audit', '--standard', 'gdpr'])
  .expectSuccess()
  .expectComplianceValidated('gdpr')
  .expectOutputContains('User consent management validated')
  
  .step('Data Retention Policies')
  .run(['data', 'retention', 'audit', '--standard', 'gdpr'])
  .expectSuccess()
  .expectComplianceValidated('gdpr')
  .expectOutputContains('Data retention policies validated')
  
  .step('Generate GDPR Report')
  .run(['compliance', 'report', 'generate', '--standard', 'gdpr', '--format', 'json'])
  .expectSuccess()
  .expectJson(data => {
    expect(data.standard).toBe('gdpr')
    expect(data.score).toBeGreaterThan(85)
    expect(data.valid).toBe(true)
  })
  
  .execute('cleanroom')

expect(gdprCompliance.success).toBe(true)
expect(gdprCompliance.steps).toHaveLength(4)
```

### 3. Performance Testing Examples

#### **Server Performance Testing**
```javascript
import { performanceFramework } from 'citty-test-utils'

const performanceTest = await scenario('Server Performance Testing')
  .step('Create Server')
  .run(['infra', 'server', 'create', '--type', 'web', '--region', 'us-east-1'])
  .expectSuccess()
  .expectResourceCreated('infra', 'server', 'web-server-001')
  
  .step('Deploy Application')
  .run(['dev', 'app', 'deploy', '--server', 'web-server-001', '--app', 'my-app'])
  .expectSuccess()
  .expectOutputContains('Application deployed successfully')
  
  .step('Load Test')
  .run(['monitor', 'load', 'test', '--server', 'web-server-001', '--duration', '300', '--users', '100'])
  .expectSuccess()
  .expectOutputContains('Load test completed')
  
  .step('Performance Analysis')
  .run(['monitor', 'performance', 'analyze', '--server', 'web-server-001', '--metric', 'response-time'])
  .expectSuccess()
  .expectJson(data => {
    expect(data.averageResponseTime).toBeLessThan(200) // 200ms
    expect(data.percentile95).toBeLessThan(500) // 500ms
    expect(data.throughput).toBeGreaterThan(1000) // 1000 req/s
  })
  
  .execute('local')

expect(performanceTest.success).toBe(true)
expect(performanceTest.steps).toHaveLength(4)
```

#### **Performance Benchmarking**
```javascript
// Benchmark server operations
const benchmarkResult = await performanceFramework.benchmark('server-operations', [
  {
    name: 'create-server',
    operation: () => runLocalCitty(['infra', 'server', 'create', '--type', 'web'])
  },
  {
    name: 'list-servers',
    operation: () => runLocalCitty(['infra', 'server', 'list'])
  },
  {
    name: 'show-server',
    operation: () => runLocalCitty(['infra', 'server', 'show', 'web-server-001'])
  },
  {
    name: 'update-server',
    operation: () => runLocalCitty(['infra', 'server', 'update', '--id', 'web-server-001', '--size', 'large'])
  },
  {
    name: 'delete-server',
    operation: () => runLocalCitty(['infra', 'server', 'delete', '--id', 'web-server-001'])
  }
])

expect(benchmarkResult.summary.totalDuration).toBeLessThan(30000) // 30 seconds
expect(benchmarkResult.summary.averageDuration).toBeLessThan(6000) // 6 seconds
expect(benchmarkResult.summary.operationsPerSecond).toBeGreaterThan(0.1) // 0.1 ops/s
```

## Enterprise Use Cases

### 1. Multi-Tenant Application Testing

#### **Tenant Isolation Testing**
```javascript
const tenantIsolation = await scenario('Multi-Tenant Isolation Testing')
  .step('Create Tenant A')
  .run(['tenant', 'create', '--name', 'tenant-a', '--domain', 'tenant-a.com'])
  .expectSuccess()
  .expectResourceCreated('tenant', 'tenant', 'tenant-a')
  
  .step('Create Tenant B')
  .run(['tenant', 'create', '--name', 'tenant-b', '--domain', 'tenant-b.com'])
  .expectSuccess()
  .expectResourceCreated('tenant', 'tenant', 'tenant-b')
  
  .step('Create Resources for Tenant A')
  .run(['infra', 'server', 'create', '--tenant', 'tenant-a', '--type', 'web'])
  .expectSuccess()
  .expectResourceCreated('infra', 'server', 'tenant-a-server-001')
  
  .step('Create Resources for Tenant B')
  .run(['infra', 'server', 'create', '--tenant', 'tenant-b', '--type', 'web'])
  .expectSuccess()
  .expectResourceCreated('infra', 'server', 'tenant-b-server-001')
  
  .step('Verify Tenant A Isolation')
  .run(['infra', 'server', 'list', '--tenant', 'tenant-a'])
  .expectSuccess()
  .expectOutputContains('tenant-a-server-001')
  .expectOutputNotContains('tenant-b-server-001')
  
  .step('Verify Tenant B Isolation')
  .run(['infra', 'server', 'list', '--tenant', 'tenant-b'])
  .expectSuccess()
  .expectOutputContains('tenant-b-server-001')
  .expectOutputNotContains('tenant-a-server-001')
  
  .execute('local')

expect(tenantIsolation.success).toBe(true)
expect(tenantIsolation.steps).toHaveLength(6)
```

### 2. Disaster Recovery Testing

#### **Disaster Recovery Workflow**
```javascript
const disasterRecovery = await scenario('Disaster Recovery Testing')
  .step('Create Primary Server')
  .run(['infra', 'server', 'create', '--type', 'web', '--region', 'us-east-1', '--name', 'primary-server'])
  .expectSuccess()
  .expectResourceCreated('infra', 'server', 'primary-server')
  
  .step('Deploy Application')
  .run(['dev', 'app', 'deploy', '--server', 'primary-server', '--app', 'my-app'])
  .expectSuccess()
  .expectOutputContains('Application deployed successfully')
  
  .step('Create Backup')
  .run(['data', 'backup', 'create', '--resource', 'primary-server', '--schedule', 'daily'])
  .expectSuccess()
  .expectResourceCreated('data', 'backup', 'backup-001')
  
  .step('Simulate Disaster')
  .run(['infra', 'server', 'delete', '--id', 'primary-server', '--simulate-disaster', 'true'])
  .expectSuccess()
  .expectResourceDeleted('infra', 'server', 'primary-server')
  
  .step('Create Recovery Server')
  .run(['infra', 'server', 'create', '--type', 'web', '--region', 'us-west-2', '--name', 'recovery-server'])
  .expectSuccess()
  .expectResourceCreated('infra', 'server', 'recovery-server')
  
  .step('Restore from Backup')
  .run(['data', 'backup', 'restore', '--backup', 'backup-001', '--server', 'recovery-server'])
  .expectSuccess()
  .expectOutputContains('Backup restored successfully')
  
  .step('Deploy Application to Recovery Server')
  .run(['dev', 'app', 'deploy', '--server', 'recovery-server', '--app', 'my-app'])
  .expectSuccess()
  .expectOutputContains('Application deployed successfully')
  
  .step('Verify Recovery')
  .run(['monitor', 'health', 'check', '--server', 'recovery-server'])
  .expectSuccess()
  .expectOutputContains('Health check passed')
  
  .execute('cleanroom')

expect(disasterRecovery.success).toBe(true)
expect(disasterRecovery.steps).toHaveLength(8)
```

### 3. Security Testing Examples

#### **Security Penetration Testing**
```javascript
const securityTesting = await scenario('Security Penetration Testing')
  .step('Create User with Limited Permissions')
  .run(['security', 'user', 'create', '--name', 'test-user', '--role', 'viewer'])
  .expectSuccess()
  .expectResourceCreated('security', 'user', 'test-user')
  
  .step('Attempt Unauthorized Server Creation')
  .run(['infra', 'server', 'create', '--type', 'web', '--user', 'test-user'])
  .expectFailure()
  .expectStderrContains('Insufficient permissions')
  
  .step('Attempt Unauthorized User Deletion')
  .run(['security', 'user', 'delete', '--id', 'admin', '--user', 'test-user'])
  .expectFailure()
  .expectStderrContains('Insufficient permissions')
  
  .step('Attempt Unauthorized Policy Modification')
  .run(['security', 'policy', 'update', '--policy', 'rbac', '--user', 'test-user'])
  .expectFailure()
  .expectStderrContains('Insufficient permissions')
  
  .step('Verify Audit Logging')
  .run(['security', 'audit', 'list', '--user', 'test-user', '--days', '1'])
  .expectSuccess()
  .expectAuditLog('create', 'user', 'test-user')
  .expectAuditLog('unauthorized', 'server', 'test-user')
  .expectAuditLog('unauthorized', 'user', 'test-user')
  .expectAuditLog('unauthorized', 'policy', 'test-user')
  
  .execute('local')

expect(securityTesting.success).toBe(true)
expect(securityTesting.steps).toHaveLength(5)
```

## Pre-built Enterprise Scenarios

### 1. Infrastructure Scenarios

#### **Server Management Scenarios**
```javascript
// Create server scenario
const createServerResult = await scenarios.infra.server.create('local').execute()
expect(createServerResult.success).toBe(true)
expect(createServerResult.result.stdout).toContain('Server created successfully')

// List servers scenario
const listServersResult = await scenarios.infra.server.list('cleanroom').execute()
expect(listServersResult.success).toBe(true)
expect(listServersResult.result.stdout).toContain('Server list')

// Server lifecycle scenario
const lifecycleResult = await scenarios.infra.server.lifecycle('local').execute()
expect(lifecycleResult.success).toBe(true)
expect(lifecycleResult.steps).toHaveLength(5)
```

#### **Network Management Scenarios**
```javascript
// Create network scenario
const createNetworkResult = await scenarios.infra.network.create('local').execute()
expect(createNetworkResult.success).toBe(true)
expect(createNetworkResult.result.stdout).toContain('Network created successfully')

// Configure network scenario
const configureNetworkResult = await scenarios.infra.network.configure('cleanroom').execute()
expect(configureNetworkResult.success).toBe(true)
expect(configureNetworkResult.result.stdout).toContain('Network configured successfully')
```

### 2. Development Scenarios

#### **Project Management Scenarios**
```javascript
// Create project scenario
const createProjectResult = await scenarios.dev.project.create('local').execute()
expect(createProjectResult.success).toBe(true)
expect(createProjectResult.result.stdout).toContain('Project created successfully')

// Deploy project scenario
const deployProjectResult = await scenarios.dev.project.deploy('cleanroom').execute()
expect(deployProjectResult.success).toBe(true)
expect(deployProjectResult.result.stdout).toContain('Project deployed successfully')

// CI/CD scenario
const cicdResult = await scenarios.dev.project.cicd('local').execute()
expect(cicdResult.success).toBe(true)
expect(cicdResult.steps).toHaveLength(4)
```

#### **Test Management Scenarios**
```javascript
// Run tests scenario
const runTestsResult = await scenarios.dev.test.run('local').execute()
expect(runTestsResult.success).toBe(true)
expect(runTestsResult.result.stdout).toContain('All tests passed')

// Regression testing scenario
const regressionResult = await scenarios.dev.test.regression('cleanroom').execute()
expect(regressionResult.success).toBe(true)
expect(regressionResult.result.stdout).toContain('Regression tests completed')

// Performance testing scenario
const performanceResult = await scenarios.dev.test.performance('local').execute()
expect(performanceResult.success).toBe(true)
expect(performanceResult.result.stdout).toContain('Performance tests completed')
```

### 3. Security Scenarios

#### **User Management Scenarios**
```javascript
// Create user scenario
const createUserResult = await scenarios.security.user.create('local').execute()
expect(createUserResult.success).toBe(true)
expect(createUserResult.result.stdout).toContain('User created successfully')

// Audit user scenario
const auditUserResult = await scenarios.security.user.audit('cleanroom').execute()
expect(auditUserResult.success).toBe(true)
expect(auditUserResult.result.stdout).toContain('User audit completed')

// User lifecycle scenario
const userLifecycleResult = await scenarios.security.user.lifecycle('local').execute()
expect(userLifecycleResult.success).toBe(true)
expect(userLifecycleResult.steps).toHaveLength(6)
```

#### **Policy Management Scenarios**
```javascript
// Create policy scenario
const createPolicyResult = await scenarios.security.policy.create('local').execute()
expect(createPolicyResult.success).toBe(true)
expect(createPolicyResult.result.stdout).toContain('Policy created successfully')

// Validate policy scenario
const validatePolicyResult = await scenarios.security.policy.validate('cleanroom').execute()
expect(validatePolicyResult.success).toBe(true)
expect(validatePolicyResult.result.stdout).toContain('Policy validation completed')

// Policy enforcement scenario
const enforcePolicyResult = await scenarios.security.policy.enforce('local').execute()
expect(enforcePolicyResult.success).toBe(true)
expect(enforcePolicyResult.result.stdout).toContain('Policy enforcement completed')
```

## Conclusion

These examples demonstrate the comprehensive capabilities of the enterprise noun-verb CLI testing framework. From simple domain commands to complex cross-domain workflows, compliance testing, and security validation, the framework provides the tools needed to test enterprise-grade CLI applications effectively.

The framework's strength lies in its ability to handle complex enterprise scenarios while maintaining simplicity and ease of use. Whether testing infrastructure management, development workflows, security policies, or compliance requirements, the framework provides the necessary tools and patterns to ensure comprehensive test coverage.
