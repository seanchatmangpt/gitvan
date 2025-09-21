# Enterprise Noun-Verb CLI Testing Framework

## 🚀 Overview

The Enterprise Noun-Verb CLI Testing Framework transforms `citty-test-utils` from a simple CLI testing tool into an enterprise-grade testing framework capable of handling complex noun-verb CLI architectures. This framework supports Fortune 500 enterprise CLI applications with massive scale and comprehensive testing capabilities.

## 🎯 Key Features

### **Enterprise Scale**
- **50+ domains** (infra, dev, security, monitor, data, compliance)
- **100+ resources per domain** (server, network, user, policy, alert, backup)
- **10+ actions per resource** (create, list, show, update, delete, audit, validate)
- **Total: 5000+ commands** in a single CLI

### **Noun-Verb Pattern Support**
```
<cli-name> <domain> <resource> <action> [options]
```

### **Cross-Domain Workflows**
- Multi-domain testing scenarios
- Complex enterprise workflows
- Compliance validation workflows
- Disaster recovery testing

### **Enterprise Features**
- **Compliance Testing**: SOX, GDPR, HIPAA, PCI-DSS
- **Security & Governance**: RBAC, policy enforcement, audit systems
- **Performance Testing**: Measurement, benchmarking, optimization
- **Enterprise Integration**: External APIs, enterprise tooling

## 📦 Installation

```bash
npm install citty-test-utils
```

## 🏗️ Architecture

### **Core Components**

1. **Command Builder System** - Fluent API for command construction
2. **Domain Registry** - Centralized management of domains, resources, and actions
3. **Enhanced Runner System** - Domain-aware execution with context management
4. **Enterprise Scenario System** - Cross-domain workflows and enterprise scenarios
5. **Enterprise Assertions** - Resource validation, compliance assertions, audit assertions
6. **Enterprise Test Utilities** - Resource management, context management, cross-domain operations

## 🚀 Quick Start

### **Basic Domain Commands**

```javascript
import { runLocalCitty } from 'citty-test-utils'

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
```

### **Fluent Command Builder**

```javascript
import { command, infra, dev, security } from 'citty-test-utils'

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
```

### **Cross-Domain Workflows**

```javascript
import { workflow } from 'citty-test-utils'

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
```

### **Enterprise Context Management**

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
```

### **Resource Lifecycle Management**

```javascript
import { workflow } from 'citty-test-utils'

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
```

### **Compliance Testing**

```javascript
import { compliance } from 'citty-test-utils'

// SOX compliance testing
const soxCompliance = await compliance('sox')
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
const gdprCompliance = await compliance('gdpr')
  .validate({
    domains: ['data', 'security'],
    resources: ['user', 'policy']
  })
  .audit(['data', 'security'])
  .report('json')
  .execute('local')

expect(gdprCompliance.success).toBe(true)
expect(gdprCompliance.steps).toHaveLength(4)
```

### **Enterprise Test Utilities**

```javascript
import { testUtils } from 'citty-test-utils'

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
```

### **Pipeline Execution**

```javascript
import { pipeline } from 'citty-test-utils'

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
```

### **Enterprise Scenarios**

```javascript
import { enterpriseScenarios } from 'citty-test-utils'

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
```

## 🏢 Enterprise Features

### **Compliance Framework**
- **Standards Support**: SOX, GDPR, HIPAA, PCI-DSS compliance
- **Policy Engine**: Rule-based policy enforcement and validation
- **Compliance Reporting**: Automated compliance reporting and analytics
- **Audit Integration**: Comprehensive audit logging and querying

### **Security and Governance**
- **RBAC Integration**: Role-based access control testing
- **Policy Enforcement**: Policy validation and enforcement testing
- **Audit Systems**: Comprehensive audit logging and monitoring
- **Security Testing**: Penetration testing and security validation

### **Performance and Monitoring**
- **Performance Framework**: Performance measurement and benchmarking
- **Performance Analysis**: Bottleneck identification and optimization
- **Performance Scenarios**: Performance testing scenarios and patterns
- **Performance Reporting**: Performance metrics and analytics

### **Enterprise Integration**
- **External APIs**: Integration with enterprise systems and tools
- **Enterprise Tooling**: CLI tools and web interfaces
- **Automation**: Automated testing and deployment workflows
- **Enterprise Configuration**: Enterprise-specific configuration management

## 📊 Success Metrics

### **Technical Metrics**
- **Performance**: <100ms command execution overhead
- **Scalability**: Support for 50+ domains, 100+ resources per domain
- **Compatibility**: 99.9% backward compatibility
- **Quality**: 95%+ test coverage, <1% defect rate

### **Enterprise Metrics**
- **Adoption**: 80%+ team adoption within 3 months
- **Efficiency**: 50% reduction in test maintenance time
- **Coverage**: 200% increase in test coverage
- **Compliance**: 100% compliance validation coverage

## 🔄 Migration Strategy

### **Backward Compatibility**
- All existing APIs remain functional
- New APIs are additive, not replacing
- Gradual migration path provided
- No breaking changes

### **Migration Path**
1. **Phase 1**: Use new APIs alongside existing ones
2. **Phase 2**: Migrate scenarios to enterprise patterns
3. **Phase 3**: Adopt enterprise utilities
4. **Phase 4**: Full enterprise feature adoption

## 📚 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - Comprehensive technical architecture
- [Technical Specifications](docs/TECHNICAL-SPECIFICATIONS.md) - Complete API specifications
- [Implementation Plan](docs/IMPLEMENTATION-PLAN.md) - Detailed implementation roadmap
- [Migration Guide](docs/MIGRATION-GUIDE.md) - Step-by-step migration guide
- [Examples and Use Cases](docs/EXAMPLES-AND-USE-CASES.md) - Comprehensive examples

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🎉 Conclusion

The Enterprise Noun-Verb CLI Testing Framework represents a significant evolution in CLI testing capabilities, transforming from simple single-verb CLI testing to comprehensive enterprise-grade testing. The framework addresses the complex needs of Fortune 500 enterprises while maintaining the simplicity and ease of use that made the original framework successful.

This framework positions `citty-test-utils` as the premier testing framework for enterprise CLI applications, enabling teams to build, test, and maintain complex CLI applications with confidence and efficiency.
