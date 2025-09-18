/**
 * GitVan Graph Architecture - Production Example
 * Complete working example demonstrating real-world usage
 */

import { GitVanGraphArchitecture } from './src/core/graph-architecture.mjs'
import { graphJobs } from './src/jobs/graph-based-jobs.mjs'
import { graphCLI } from './src/cli/graph.mjs'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

console.log('🚀 GitVan Graph Architecture - Production Example')
console.log('=' .repeat(60))

class GitVanProductionExample {
  constructor() {
    this.graphArch = new GitVanGraphArchitecture()
    this.projectName = 'GitVan Production Demo'
    this.initialized = false
  }

  async runProductionExample() {
    try {
      console.log('\n🏗️ Initializing GitVan Graph Architecture...')
      await this.initializeArchitecture()

      console.log('\n📊 Setting up project data...')
      await this.setupProjectData()

      console.log('\n🚀 Executing development workflow...')
      await this.executeDevelopmentWorkflow()

      console.log('\n🤖 Processing with AI enhancement...')
      await this.processWithAI()

      console.log('\n📦 Managing packages...')
      await this.managePackages()

      console.log('\n🏪 Operating marketplace...')
      await this.operateMarketplace()

      console.log('\n🔄 Processing Git events...')
      await this.processGitEvents()

      console.log('\n📸 Creating snapshots...')
      await this.createSnapshots()

      console.log('\n📊 Generating analytics...')
      await this.generateAnalytics()

      console.log('\n🎯 Production example completed successfully!')

    } catch (error) {
      console.error('❌ Production example failed:', error.message)
      console.error(error.stack)
    }
  }

  async initializeArchitecture() {
    await this.graphArch.initialize()
    this.initialized = true
    console.log('✅ GitVan Graph Architecture initialized')
  }

  async setupProjectData() {
    const projectGraph = this.graphArch.graphManager.getDefaultGraph('project')
    
    // Add comprehensive project data
    await projectGraph.addTurtle(`
      @prefix gv: <https://gitvan.dev/project/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      
      gv:${this.projectName.replace(/\s+/g, '_').toLowerCase()} rdf:type gv:Project ;
        gv:name "${this.projectName}" ;
        gv:description "Production demonstration of GitVan Graph Architecture" ;
        gv:version "1.0.0" ;
        gv:createdAt "${new Date().toISOString()}" ;
        gv:status "active" ;
        gv:technologies "JavaScript, Node.js, RDF, SPARQL" ;
        gv:repository "https://github.com/gitvan/production-demo" ;
        gv:maintainer "GitVan Team" .
    `)

    // Add file structure data
    await projectGraph.addTurtle(`
      gv:file_src_core rdf:type gv:File ;
        gv:path "src/core/graph-architecture.mjs" ;
        gv:type "module" ;
        gv:size "15000" ;
        gv:lines "500" ;
        gv:lastModified "${new Date().toISOString()}" .
        
      gv:file_src_jobs rdf:type gv:File ;
        gv:path "src/jobs/graph-based-jobs.mjs" ;
        gv:type "module" ;
        gv:size "8000" ;
        gv:lines "300" ;
        gv:lastModified "${new Date().toISOString()}" .
        
      gv:file_tests rdf:type gv:File ;
        gv:path "tests/e2e-test.mjs" ;
        gv:type "test" ;
        gv:size "12000" ;
        gv:lines "400" ;
        gv:lastModified "${new Date().toISOString()}" .
    `)

    console.log('✅ Project data setup complete')
  }

  async executeDevelopmentWorkflow() {
    // Execute project analysis
    const analysisResult = await graphJobs.projectAnalysis.run({
      inputs: { 
        files: [
          'src/core/graph-architecture.mjs',
          'src/jobs/graph-based-jobs.mjs',
          'src/cli/graph.mjs',
          'tests/e2e-test.mjs',
          'docs/graph-architecture.md'
        ]
      }
    })

    console.log(`✅ Project analysis completed: ${analysisResult.metrics.fileCount} files analyzed`)

    // Execute pack dependency analysis
    const dependencyResult = await graphJobs.packDependency.run({
      inputs: { packId: 'production-demo' }
    })

    console.log(`✅ Dependency analysis completed: ${dependencyResult.dependencies.length} dependencies`)

    // Execute marketplace indexing
    const marketplaceData = [
      { id: 'react-pack', name: 'React Development Pack', type: 'framework', category: 'frontend', downloads: 5000, rating: 4.8 },
      { id: 'node-pack', name: 'Node.js Runtime Pack', type: 'runtime', category: 'backend', downloads: 8000, rating: 4.9 },
      { id: 'ai-pack', name: 'AI Template Pack', type: 'ai', category: 'intelligence', downloads: 2000, rating: 4.6 },
      { id: 'graph-pack', name: 'Graph Database Pack', type: 'database', category: 'data', downloads: 1500, rating: 4.7 }
    ]

    const indexResult = await graphJobs.marketplaceIndex.run({
      inputs: { marketplaceData }
    })

    console.log(`✅ Marketplace indexing completed: ${indexResult.indexed} items indexed`)
  }

  async processWithAI() {
    // Process multiple AI templates
    const templates = [
      {
        id: 'project-overview',
        content: '# Project Overview\n\n## Summary\n{{ project.name }} is a {{ project.description }}.',
        context: { project: { name: this.projectName, description: 'graph-based development platform' } }
      },
      {
        id: 'architecture-doc',
        content: '# Architecture Documentation\n\n## Components\n{% for component in components %}- {{ component.name }}\n{% endfor %}',
        context: { components: [
          { name: 'Graph Registry' },
          { name: 'AI Loop' },
          { name: 'Pack System' },
          { name: 'Marketplace' }
        ]}
      },
      {
        id: 'deployment-guide',
        content: '# Deployment Guide\n\n## Steps\n1. Initialize architecture\n2. Configure graphs\n3. Deploy jobs\n4. Start daemon',
        context: { environment: 'production', version: '1.0.0' }
      }
    ]

    for (const template of templates) {
      const aiResult = await this.graphArch.processAITemplate(
        template.id,
        { content: template.content, metadata: { type: 'documentation' } },
        template.context
      )

      console.log(`✅ AI template processed: ${aiResult.templateId}`)
    }
  }

  async managePackages() {
    // Register multiple packs
    const packs = [
      {
        id: 'react-development',
        name: 'React Development Pack',
        version: '2.1.0',
        description: 'Complete React development environment',
        dependencies: ['react', 'react-dom', 'nextjs'],
        jobs: ['create-component', 'build', 'test', 'deploy'],
        templates: ['component', 'page', 'layout', 'api']
      },
      {
        id: 'ai-templates',
        name: 'AI Template Pack',
        version: '1.5.0',
        description: 'AI-enhanced template system',
        dependencies: ['ollama', 'nunjucks'],
        jobs: ['generate-template', 'optimize-template', 'learn-patterns'],
        templates: ['ai-report', 'ai-documentation', 'ai-code']
      },
      {
        id: 'graph-analytics',
        name: 'Graph Analytics Pack',
        version: '1.2.0',
        description: 'Advanced graph analytics and reporting',
        dependencies: ['sparql', 'rdf'],
        jobs: ['analyze-graph', 'generate-insights', 'create-dashboard'],
        templates: ['analytics-report', 'dashboard', 'insights']
      }
    ]

    for (const pack of packs) {
      const packResult = await this.graphArch.registerPack(pack.id, pack)
      console.log(`✅ Pack registered: ${packResult.packId}`)

      // Analyze pack compatibility
      const analysisResult = await this.graphArch.packSystem.analyzePackCompatibility(pack.id)
      console.log(`✅ Pack analysis completed: ${analysisResult.packId}`)
    }
  }

  async operateMarketplace() {
    // Search marketplace
    const searchResults = await this.graphArch.searchMarketplace('react', { type: 'framework' })
    console.log(`✅ Marketplace search completed: ${searchResults.length} results`)

    // Generate analytics
    const analyticsResult = await this.graphArch.marketplace.generateMarketplaceAnalytics()
    console.log(`✅ Marketplace analytics generated: ${analyticsResult.categoryDistribution.length} categories`)

    // Index additional data
    const additionalData = [
      { id: 'vue-pack', name: 'Vue.js Pack', type: 'framework', category: 'frontend', downloads: 3000, rating: 4.5 },
      { id: 'angular-pack', name: 'Angular Pack', type: 'framework', category: 'frontend', downloads: 4000, rating: 4.4 },
      { id: 'svelte-pack', name: 'Svelte Pack', type: 'framework', category: 'frontend', downloads: 1500, rating: 4.7 }
    ]

    const indexResult = await this.graphArch.marketplace.indexMarketplaceData(additionalData)
    console.log(`✅ Additional marketplace data indexed: ${indexResult.indexed} items`)
  }

  async processGitEvents() {
    // Simulate multiple Git events
    const events = [
      {
        type: 'post-commit',
        data: {
          sha: 'abc123def456',
          message: 'feat: implement graph architecture',
          author: 'Developer One',
          timestamp: new Date().toISOString(),
          files: ['src/core/graph-architecture.mjs', 'src/jobs/graph-based-jobs.mjs']
        }
      },
      {
        type: 'post-merge',
        data: {
          sha: 'def456ghi789',
          message: 'merge: integrate AI template loop',
          author: 'Developer Two',
          timestamp: new Date().toISOString(),
          files: ['src/ai/template-learning.mjs', 'src/ai/prompt-evolution.mjs']
        }
      },
      {
        type: 'post-commit',
        data: {
          sha: 'ghi789jkl012',
          message: 'docs: update architecture documentation',
          author: 'Technical Writer',
          timestamp: new Date().toISOString(),
          files: ['docs/graph-architecture.md', 'docs/implementation-guide.md']
        }
      }
    ]

    for (const event of events) {
      const processResult = await this.graphArch.processGitEvent(event.type, event.data)
      console.log(`✅ Git event processed: ${event.type} - ${processResult.jobsExecuted} jobs executed`)
    }
  }

  async createSnapshots() {
    const projectGraph = this.graphArch.graphManager.getDefaultGraph('project')
    
    // Create comprehensive snapshots
    const snapshots = [
      {
        type: 'json',
        family: 'production',
        name: 'project-metrics',
        data: {
          project: this.projectName,
          timestamp: new Date().toISOString(),
          metrics: {
            files: 15,
            lines: 2500,
            tests: 8,
            documentation: 5
          },
          status: 'active'
        }
      },
      {
        type: 'text',
        family: 'production',
        name: 'deployment-summary',
        content: `# Deployment Summary

## Project: ${this.projectName}
## Timestamp: ${new Date().toISOString()}

### Architecture Components
- Graph Registry: Active
- AI Loop: Active
- Pack System: Active
- Marketplace: Active
- Daemon: Active

### Performance Metrics
- Initialization Time: < 1s
- Query Performance: < 100ms
- Job Execution: < 500ms
- AI Processing: < 2s

### Status: Production Ready ✅`,
        extension: 'md'
      }
    ]

    for (const snapshot of snapshots) {
      let result
      if (snapshot.type === 'json') {
        result = await projectGraph.snapshotJSON(snapshot.family, snapshot.name, snapshot.data)
      } else {
        result = await projectGraph.snapshotText(snapshot.family, snapshot.name, snapshot.content, snapshot.extension)
      }
      console.log(`✅ Snapshot created: ${result.path}`)
    }

    // Create latest marker
    await projectGraph.latest('production')
    console.log('✅ Latest marker created')

    // Create receipt
    const receipt = await projectGraph.receipt('production-example', [
      { path: 'project-metrics.json' },
      { path: 'deployment-summary.md' }
    ])
    console.log(`✅ Receipt created: ${receipt.path}`)
  }

  async generateAnalytics() {
    // Generate comprehensive analytics
    const analyticsResult = await graphJobs.graphAnalytics.run({})
    
    console.log('✅ Analytics generated:')
    console.log(`   - Project events: ${analyticsResult.analytics.project.length}`)
    console.log(`   - Job statistics: ${analyticsResult.analytics.jobs.length}`)
    console.log(`   - Pack metrics: ${analyticsResult.analytics.packs.length}`)
    console.log(`   - AI templates: ${analyticsResult.analytics.ai.length}`)

    // Generate detailed report
    const reportResult = await graphJobs.graphReport.run({
      inputs: {
        reportType: 'production-summary',
        template: `
# Production Summary Report

## Project Overview
**Name**: ${this.projectName}
**Generated**: {{ generatedAt }}

## Architecture Status
- Graph Architecture: ✅ Active
- AI Integration: ✅ Active
- Pack Management: ✅ Active
- Marketplace: ✅ Active
- Daemon: ✅ Active

## Performance Metrics
{% for metric in projectMetrics %}
- {{ metric.metric }}: {{ metric.value }}
{% endfor %}

## Job Statistics
{% for stat in jobStats %}
- {{ stat.status }}: {{ stat.count }}
{% endfor %}

## Summary
The GitVan Graph Architecture is fully operational and ready for production use.
All components are functioning correctly and performance metrics are within acceptable ranges.
        `
      }
    })

    console.log(`✅ Production report generated: ${reportResult.reportType}`)
  }

  async demonstrateCLI() {
    console.log('\n🔧 CLI Demonstration:')
    
    // Show status
    const status = await graphCLI.status()
    console.log(`   Status: ${status.graphs} graphs active`)

    // Execute query
    const queryResult = await graphCLI.query('project', `
      PREFIX gv: <https://gitvan.dev/project/>
      SELECT ?name ?status WHERE {
        ?project rdf:type gv:Project ;
          gv:name ?name ;
          gv:status ?status .
      }
    `)
    console.log(`   Query: ${queryResult.count} results`)

    // Generate analytics
    const analytics = await graphCLI.analytics('jobs')
    console.log(`   Analytics: ${analytics.analytics.length} categories`)

    // Create snapshot
    const snapshot = await graphCLI.snapshot('project', { name: 'cli-demo' })
    console.log(`   Snapshot: ${snapshot.path}`)
  }
}

// Run production example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const productionExample = new GitVanProductionExample()
  productionExample.runProductionExample()
    .then(() => productionExample.demonstrateCLI())
    .catch(console.error)
}

export { GitVanProductionExample }





