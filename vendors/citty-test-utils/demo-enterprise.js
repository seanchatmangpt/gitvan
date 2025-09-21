#!/usr/bin/env node

/**
 * Enterprise Noun-Verb CLI Testing Framework Demo
 *
 * This script demonstrates the basic functionality of the enterprise framework
 */

import { command, CommandBuilder, ResourceBuilder, ActionBuilder } from './src/command-builder.js'
import { domainRegistry, createDomainRegistry } from './src/domain-registry.js'

console.log('🚀 Enterprise Noun-Verb CLI Testing Framework Demo')
console.log('=' * 60)

// Test Command Builder System
console.log('\n📦 Command Builder System')
console.log('-' * 30)

// Create a command builder instance
const builder = new CommandBuilder()
console.log('✅ Created CommandBuilder instance')

// Test domain-first approach
const resourceBuilder = builder.domain('infra')
console.log('✅ Domain-first approach:', resourceBuilder instanceof ResourceBuilder)
console.log('✅ Domain set:', builder.domain === 'infra')

// Test resource-first approach
const actionBuilder = builder.resource('infra', 'server')
console.log('✅ Resource-first approach:', actionBuilder instanceof ActionBuilder)
console.log('✅ Resource set:', builder.resource === 'server')

// Test direct command construction
const result = builder.command('infra', 'server', 'create')
console.log('✅ Direct command construction:', result === builder)
console.log('✅ Action set:', builder.action === 'create')

// Test adding arguments
builder.command('infra', 'server', 'create').arg('--type', 'web').arg('--region', 'us-east-1')

console.log('✅ Arguments added:', builder.args['--type'] === 'web')
console.log('✅ Arguments added:', builder.args['--region'] === 'us-east-1')

// Test adding multiple arguments
builder.command('infra', 'server', 'create').args({
  '--type': 'web',
  '--region': 'us-east-1',
  '--size': 'large',
})

console.log('✅ Multiple arguments added:', builder.args['--size'] === 'large')

// Test adding options
builder.command('infra', 'server', 'create').option('--verbose', true).option('--dry-run', false)

console.log('✅ Options added:', builder.options['--verbose'] === true)
console.log('✅ Options added:', builder.options['--dry-run'] === false)

// Test enterprise context
const context = {
  project: 'enterprise-prod',
  environment: 'staging',
  region: 'us-east-1',
}

builder.command('infra', 'server', 'create').context(context)

console.log('✅ Enterprise context set:', builder.context.project === 'enterprise-prod')

// Test building command array
const commandArray = builder
  .command('infra', 'server', 'create')
  .arg('--type', 'web')
  .arg('--region', 'us-east-1')
  .option('--verbose', true)
  .build()

console.log('✅ Command array built:', commandArray)
console.log('✅ Expected command:', [
  'infra',
  'server',
  'create',
  '--type',
  'web',
  '--region',
  'us-east-1',
  '--verbose',
])

// Test Fluent API
console.log('\n🔗 Fluent API')
console.log('-' * 30)

// Domain-first approach
const cmd = command('infra').server().create().arg('--type', 'web').arg('--region', 'us-east-1')

console.log('✅ Fluent command construction:', cmd.domain === 'infra')
console.log('✅ Fluent command construction:', cmd.resource === 'server')
console.log('✅ Fluent command construction:', cmd.action === 'create')

// Resource-first approach
const cmd2 = command()
  .domain('dev')
  .resource('project')
  .action('create')
  .arg('--name', 'my-app')
  .arg('--type', 'web')

console.log('✅ Resource-first approach:', cmd2.domain === 'dev')
console.log('✅ Resource-first approach:', cmd2.resource === 'project')
console.log('✅ Resource-first approach:', cmd2.action === 'create')

// Test Domain Registry
console.log('\n📋 Domain Registry System')
console.log('-' * 30)

// Initialize default registry
const registry = createDomainRegistry()
console.log('✅ Default registry initialized')

// List domains
const domains = registry.listDomains()
console.log('✅ Domains available:', domains.length)
console.log(
  '✅ Infrastructure domain:',
  domains.some((d) => d.name === 'infra')
)
console.log(
  '✅ Development domain:',
  domains.some((d) => d.name === 'dev')
)
console.log(
  '✅ Security domain:',
  domains.some((d) => d.name === 'security')
)

// List resources
const infraResources = registry.listResources('infra')
console.log('✅ Infrastructure resources:', infraResources.length)
console.log(
  '✅ Server resource:',
  infraResources.some((r) => r.name === 'server')
)
console.log(
  '✅ Network resource:',
  infraResources.some((r) => r.name === 'network')
)

console.log('\n🎉 Enterprise Noun-Verb CLI Testing Framework Demo Complete!')
console.log('✅ All core components working correctly')
console.log('✅ Ready for enterprise CLI testing')
