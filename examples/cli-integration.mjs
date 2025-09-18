#!/usr/bin/env node
/**
 * GitVan Graph Architecture - CLI Integration
 * Complete CLI demonstration of the graph architecture
 */

import { GitVanGraphArchitecture } from '../src/core/graph-architecture.mjs'
import { graphJobs } from '../src/jobs/graph-based-jobs.mjs'
import { graphCLI } from '../src/cli/graph.mjs'

console.log('🚀 GitVan Graph Architecture - CLI Integration')
console.log('=' .repeat(60))

class GitVanCLIIntegration {
  constructor() {
    this.graphArch = new GitVanGraphArchitecture()
    this.initialized = false
  }

  async runCLIDemonstration() {
    try {
      console.log('\n🏗️ Initializing GitVan Graph Architecture...')
      await this.graphArch.initialize()
      this.initialized = true

      console.log('\n📊 CLI Status Command')
      await this.demonstrateStatus()

      console.log('\n🔍 CLI Query Commands')
      await this.demonstrateQueries()

      console.log('\n📊 CLI Analytics Commands')
      await this.demonstrateAnalytics()

      console.log('\n🚀 CLI Job Commands')
      await this.demonstrateJobs()

      console.log('\n🤖 CLI AI Commands')
      await this.demonstrateAI()

      console.log('\n📦 CLI Pack Commands')
      await this.demonstratePacks()

      console.log('\n🏪 CLI Marketplace Commands')
      await this.demonstrateMarketplace()

      console.log('\n🔄 CLI Daemon Commands')
      await this.demonstrateDaemon()

      console.log('\n📸 CLI Snapshot Commands')
      await this.demonstrateSnapshots()

      console.log('\n🎯 CLI Integration completed successfully!')

    } catch (error) {
      console.error('❌ CLI integration failed:', error.message)
      console.error(error.stack)
    }
  }

  async demonstrateStatus() {
    console.log('Running: gitvan graph status')
    const status = await graphCLI.status()
    console.log(`✅ Status: ${status.graphs} graphs active, status: ${status.status}`)
  }

  async demonstrateQueries() {
    // Project query
    console.log('Running: gitvan graph query project "SELECT ?name WHERE { ?p rdf:type gv:Project ; gv:name ?name }"')
    const projectQuery = await graphCLI.query('project', `
      PREFIX gv: <https://gitvan.dev/project/>
      SELECT ?name ?status WHERE {
        ?project rdf:type gv:Project ;
          gv:name ?name ;
          gv:status ?status .
      }
    `)
    console.log(`✅ Project query: ${projectQuery.count} results`)

    // Jobs query
    console.log('Running: gitvan graph query jobs "SELECT ?jobId ?status WHERE { ?job rdf:type gv:Job }"')
    const jobsQuery = await graphCLI.query('jobs', `
      PREFIX gv: <https://gitvan.dev/jobs/>
      SELECT ?jobId ?status WHERE {
        ?job rdf:type gv:Job ;
          gv:jobId ?jobId ;
          gv:status ?status .
      }
    `)
    console.log(`✅ Jobs query: ${jobsQuery.count} results`)

    // Packs query
    console.log('Running: gitvan graph query packs "SELECT ?packId ?name WHERE { ?pack rdf:type gv:Pack }"')
    const packsQuery = await graphCLI.query('packs', `
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?packId ?name WHERE {
        ?pack rdf:type gv:Pack ;
          gv:packId ?packId ;
          gv:name ?name .
      }
    `)
    console.log(`✅ Packs query: ${packsQuery.count} results`)
  }

  async demonstrateAnalytics() {
    // Project analytics
    console.log('Running: gitvan graph analytics project')
    const projectAnalytics = await graphCLI.analytics('project')
    console.log(`✅ Project analytics: ${projectAnalytics.analytics.length} categories`)

    // Jobs analytics
    console.log('Running: gitvan graph analytics jobs')
    const jobsAnalytics = await graphCLI.analytics('jobs')
    console.log(`✅ Jobs analytics: ${jobsAnalytics.analytics.length} categories`)

    // Packs analytics
    console.log('Running: gitvan graph analytics packs')
    const packsAnalytics = await graphCLI.analytics('packs')
    console.log(`✅ Packs analytics: ${packsAnalytics.analytics.length} categories`)

    // AI analytics
    console.log('Running: gitvan graph analytics ai')
    const aiAnalytics = await graphCLI.analytics('ai')
    console.log(`✅ AI analytics: ${aiAnalytics.analytics.length} categories`)

    // Marketplace analytics
    console.log('Running: gitvan graph analytics marketplace')
    const marketplaceAnalytics = await graphCLI.analytics('marketplace')
    console.log(`✅ Marketplace analytics: ${marketplaceAnalytics.analytics.length} categories`)
  }

  async demonstrateJobs() {
    // Project analysis job
    console.log('Running: gitvan graph job projectAnalysis')
    const projectAnalysis = await graphCLI.runJob('projectAnalysis', {
      files: ['src/**/*.mjs', 'tests/**/*.mjs', 'docs/**/*.md']
    })
    console.log(`✅ Project analysis job: ${projectAnalysis.status}`)

    // Graph analytics job
    console.log('Running: gitvan graph job graphAnalytics')
    const graphAnalytics = await graphCLI.runJob('graphAnalytics', {})
    console.log(`✅ Graph analytics job: ${graphAnalytics.status}`)

    // Report generation job
    console.log('Running: gitvan graph job graphReport')
    const graphReport = await graphCLI.runJob('graphReport', {
      reportType: 'cli-demo',
      template: `
# CLI Demo Report

## Summary
Generated at: {{ generatedAt }}

## Project Metrics
{% for metric in projectMetrics %}
- {{ metric.metric }}: {{ metric.value }}
{% endfor %}

## Job Statistics
{% for stat in jobStats %}
- {{ stat.status }}: {{ stat.count }}
{% endfor %}
      `
    })
    console.log(`✅ Report generation job: ${graphReport.status}`)
  }

  async demonstrateAI() {
    // AI template processing
    console.log('Running: gitvan graph ai cli-demo-template')
    const aiResult = await graphCLI.ai('cli-demo-template', {
      content: '# CLI Demo Template\n\n## Status\nCLI demonstration successful.',
      metadata: { type: 'demo', version: '1.0' }
    }, {
      context: 'CLI demonstration',
      environment: 'development'
    })
    console.log(`✅ AI template processing: ${aiResult.templateId}`)

    // Multiple AI templates
    const templates = [
      {
        id: 'architecture-overview',
        content: '# Architecture Overview\n\n## Components\n- Graph Registry\n- AI Loop\n- Pack System',
        context: { type: 'documentation' }
      },
      {
        id: 'performance-report',
        content: '# Performance Report\n\n## Metrics\n- Query Time: < 100ms\n- Job Execution: < 500ms',
        context: { type: 'performance' }
      }
    ]

    for (const template of templates) {
      const result = await graphCLI.ai(template.id, { content: template.content }, template.context)
      console.log(`✅ AI template: ${result.templateId}`)
    }
  }

  async demonstratePacks() {
    // Register packs
    const packs = [
      {
        id: 'cli-demo-pack',
        name: 'CLI Demo Pack',
        version: '1.0.0',
        description: 'Pack for CLI demonstration',
        dependencies: ['node', 'javascript'],
        jobs: ['demo', 'test']
      },
      {
        id: 'graph-tools-pack',
        name: 'Graph Tools Pack',
        version: '2.0.0',
        description: 'Advanced graph processing tools',
        dependencies: ['sparql', 'rdf'],
        jobs: ['analyze', 'optimize', 'visualize']
      }
    ]

    for (const pack of packs) {
      console.log(`Running: gitvan graph pack register ${pack.id}`)
      const registerResult = await graphCLI.pack('register', pack.id, pack)
      console.log(`✅ Pack registered: ${registerResult.packId}`)

      console.log(`Running: gitvan graph pack analyze ${pack.id}`)
      const analysisResult = await graphCLI.pack('analyze', pack.id)
      console.log(`✅ Pack analysis: ${analysisResult.packId}`)
    }
  }

  async demonstrateMarketplace() {
    // Search marketplace
    console.log('Running: gitvan graph marketplace search "react"')
    const searchResult = await graphCLI.marketplace('search', 'react', { type: 'framework' })
    console.log(`✅ Marketplace search: ${searchResult.length} results`)

    // Index marketplace data
    const marketplaceData = [
      { id: 'cli-demo-item', name: 'CLI Demo Item', type: 'tool', category: 'cli', downloads: 100, rating: 4.5 },
      { id: 'graph-demo-item', name: 'Graph Demo Item', type: 'library', category: 'graph', downloads: 200, rating: 4.7 }
    ]

    console.log('Running: gitvan graph marketplace index')
    const indexResult = await graphCLI.marketplace('index', marketplaceData)
    console.log(`✅ Marketplace indexing: ${indexResult.indexed} items`)

    // Generate analytics
    console.log('Running: gitvan graph marketplace analytics')
    const analyticsResult = await graphCLI.marketplace('analytics')
    console.log(`✅ Marketplace analytics: ${analyticsResult.categoryDistribution.length} categories`)
  }

  async demonstrateDaemon() {
    // Start daemon
    console.log('Running: gitvan graph daemon start')
    const startResult = await graphCLI.daemon('start')
    console.log(`✅ Daemon started: ${startResult.status}`)

    // Process Git events
    const events = [
      {
        type: 'post-commit',
        data: {
          sha: 'cli-demo-sha-123',
          message: 'feat: CLI demonstration',
          author: 'CLI Demo User',
          timestamp: new Date().toISOString(),
          files: ['cli-demo.mjs']
        }
      },
      {
        type: 'post-merge',
        data: {
          sha: 'cli-demo-sha-456',
          message: 'merge: CLI integration',
          author: 'CLI Demo User',
          timestamp: new Date().toISOString(),
          files: ['integration.mjs']
        }
      }
    ]

    for (const event of events) {
      console.log(`Running: gitvan graph daemon process ${event.type}`)
      const processResult = await graphCLI.daemon('process', event.data)
      console.log(`✅ Event processed: ${processResult.jobsExecuted} jobs executed`)
    }
  }

  async demonstrateSnapshots() {
    // Create snapshots for each graph
    const graphs = ['project', 'jobs', 'packs', 'ai', 'marketplace']

    for (const graphId of graphs) {
      console.log(`Running: gitvan graph snapshot ${graphId}`)
      const snapshot = await graphCLI.snapshot(graphId, {
        name: `cli-demo-${graphId}`,
        family: 'cli-demonstration'
      })
      console.log(`✅ Snapshot created: ${snapshot.path}`)
    }

    // Create comprehensive snapshot
    console.log('Running: gitvan graph snapshot project --name comprehensive --family cli-demo')
    const comprehensiveSnapshot = await graphCLI.snapshot('project', {
      name: 'comprehensive-cli-demo',
      family: 'cli-demonstration'
    })
    console.log(`✅ Comprehensive snapshot: ${comprehensiveSnapshot.path}`)
  }

  async demonstrateHelp() {
    console.log('\n📖 CLI Help Command')
    console.log('Running: gitvan graph help')
    await graphCLI.help()
  }

  async demonstrateDataOperations() {
    console.log('\n📊 CLI Data Operations')
    
    // Add data to graphs
    const projectGraph = this.graphArch.graphManager.getDefaultGraph('project')
    
    // Add CSV data
    console.log('Running: gitvan graph add project data.csv --type csv')
    const csvData = `name,type,size
project-file.mjs,module,15000
test-file.mjs,test,8000
doc-file.md,documentation,2000`
    
    await fs.writeFile('temp-data.csv', csvData)
    const addResult = await graphCLI.addData('project', 'temp-data.csv', { type: 'csv' })
    console.log(`✅ CSV data added: ${addResult.status}`)

    // Add Turtle data
    console.log('Running: gitvan graph add project data.ttl --type turtle')
    const turtleData = `
      @prefix gv: <https://gitvan.dev/project/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      
      gv:cli_demo_file rdf:type gv:File ;
        gv:name "CLI Demo File" ;
        gv:type "demonstration" ;
        gv:createdAt "${new Date().toISOString()}" .
    `
    
    await fs.writeFile('temp-data.ttl', turtleData)
    const addTurtleResult = await graphCLI.addData('project', 'temp-data.ttl', { type: 'turtle' })
    console.log(`✅ Turtle data added: ${addTurtleResult.status}`)

    // Cleanup temp files
    await fs.unlink('temp-data.csv').catch(() => {})
    await fs.unlink('temp-data.ttl').catch(() => {})
  }

  async demonstrateTemplates() {
    console.log('\n🎨 CLI Template Operations')
    
    // Create template file
    const templateContent = `
# CLI Demo Template

## Project: {{ projectName }}
## Generated: {{ generatedAt }}

## Files
{% for file in files %}
- {{ file.name }} ({{ file.type }})
{% endfor %}

## Summary
This template was generated using the GitVan CLI.
    `
    
    await fs.writeFile('cli-demo-template.md', templateContent)
    
    // Render template
    console.log('Running: gitvan graph template project cli-demo-template.md')
    const templateResult = await graphCLI.template('project', 'cli-demo-template.md', {
      output: 'cli-demo-output.md'
    })
    console.log(`✅ Template rendered: ${templateResult.saved}`)

    // Cleanup
    await fs.unlink('cli-demo-template.md').catch(() => {})
    await fs.unlink('cli-demo-output.md').catch(() => {})
  }
}

// Run CLI demonstration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cliIntegration = new GitVanCLIIntegration()
  cliIntegration.runCLIDemonstration()
    .then(() => cliIntegration.demonstrateHelp())
    .then(() => cliIntegration.demonstrateDataOperations())
    .then(() => cliIntegration.demonstrateTemplates())
    .catch(console.error)
}

export { GitVanCLIIntegration }





