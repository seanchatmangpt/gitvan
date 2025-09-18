/**
 * GitVan Graph-Based User Feedback System
 * Modern implementation using useGraph with best practices
 */

import { useGraph } from '../composables/graph.mjs'
import { withGitVan } from '../composables/ctx.mjs'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import consola from 'consola'

/**
 * Graph-Based User Feedback Manager
 * Uses RDF/SPARQL for complex feedback pattern analysis and AI optimization
 */
export class GraphUserFeedbackManager {
  constructor(options = {}) {
    this.options = {
      feedbackDir: options.feedbackDir || '.gitvan/feedback',
      snapshotsDir: options.snapshotsDir || '.gitvan/graphs/feedback/snapshots',
      baseIRI: options.baseIRI || 'https://gitvan.dev/feedback/',
      ...options
    }
    this.graph = null
    this.initialized = false
  }

  /**
   * Initialize the graph-based feedback manager
   */
  async initialize() {
    if (this.initialized) return this

    await withGitVan({ cwd: process.cwd() }, async () => {
      this.graph = await useGraph({
        baseIRI: this.options.baseIRI,
        snapshotsDir: this.options.snapshotsDir
      })

      // Set up feedback-specific shapes for validation
      await this.graph.setShapes(`
        @prefix gv: <https://gitvan.dev/feedback/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        gv:FeedbackShape a sh:NodeShape ;
          sh:targetClass gv:Feedback ;
          sh:property [
            sh:path gv:feedbackId ;
            sh:datatype xsd:string ;
            sh:minCount 1 ;
            sh:maxCount 1 ;
          ] ;
          sh:property [
            sh:path gv:templateId ;
            sh:datatype xsd:string ;
            sh:minCount 1 ;
          ] ;
          sh:property [
            sh:path gv:rating ;
            sh:datatype xsd:integer ;
            sh:minInclusive 1 ;
            sh:maxInclusive 5 ;
          ] ;
          sh:property [
            sh:path gv:comment ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:timestamp ;
            sh:datatype xsd:dateTime ;
            sh:minCount 1 ;
          ] ;
          sh:property [
            sh:path gv:userContext ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:templateContext ;
            sh:datatype xsd:string ;
          ] .

        gv:TemplateShape a sh:NodeShape ;
          sh:targetClass gv:Template ;
          sh:property [
            sh:path gv:templateId ;
            sh:datatype xsd:string ;
            sh:minCount 1 ;
          ] ;
          sh:property [
            sh:path gv:templateType ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:averageRating ;
            sh:datatype xsd:decimal ;
          ] ;
          sh:property [
            sh:path gv:totalRatings ;
            sh:datatype xsd:integer ;
          ] ;
          sh:property [
            sh:path gv:lastUpdated ;
            sh:datatype xsd:dateTime ;
          ] .

        gv:PatternShape a sh:NodeShape ;
          sh:targetClass gv:Pattern ;
          sh:property [
            sh:path gv:patternId ;
            sh:datatype xsd:string ;
            sh:minCount 1 ;
          ] ;
          sh:property [
            sh:path gv:patternType ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:confidence ;
            sh:datatype xsd:decimal ;
          ] ;
          sh:property [
            sh:path gv:frequency ;
            sh:datatype xsd:integer ;
          ] .
      `)

      this.initialized = true
      consola.info('Graph-based user feedback manager initialized')
    })

    return this
  }

  /**
   * Submit feedback with graph-based storage
   */
  async submitFeedback(feedbackData) {
    await this.initialize()

    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    const turtle = `
      @prefix gv: <https://gitvan.dev/feedback/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      gv:${feedbackId} rdf:type gv:Feedback ;
        gv:feedbackId "${feedbackId}" ;
        gv:templateId "${feedbackData.templateId}" ;
        gv:rating "${feedbackData.rating}" ;
        gv:comment "${feedbackData.comment || ''}" ;
        gv:timestamp "${timestamp}" ;
        gv:userContext "${JSON.stringify(feedbackData.userContext || {})}" ;
        gv:templateContext "${JSON.stringify(feedbackData.templateContext || {})}" ;
        gv:sessionId "${feedbackData.sessionId || ''}" ;
        gv:userId "${feedbackData.userId || 'anonymous'}" ;
        gv:category "${feedbackData.category || 'general'}" ;
        gv:tags "${JSON.stringify(feedbackData.tags || [])}" ;
        gv:metadata "${JSON.stringify(feedbackData.metadata || {})}" .
    `

    await this.graph.addTurtle(turtle)

    // Update template statistics
    await this.updateTemplateStatistics(feedbackData.templateId, feedbackData.rating)

    // Analyze patterns
    await this.analyzePatterns(feedbackData)

    // Create snapshot
    await this.graph.snapshotJSON('feedback', 'feedback-submitted', {
      feedbackId,
      templateId: feedbackData.templateId,
      rating: feedbackData.rating,
      timestamp,
      action: 'submitted'
    })

    consola.success(`Feedback submitted: ${feedbackId}`)
    return { feedbackId, status: 'submitted' }
  }

  /**
   * Update template statistics using graph queries
   */
  async updateTemplateStatistics(templateId, rating) {
    // Get current template stats
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?averageRating ?totalRatings WHERE {
        gv:${templateId} rdf:type gv:Template ;
          gv:averageRating ?averageRating ;
          gv:totalRatings ?totalRatings .
      }
    `)

    const currentStats = await this.graph.select()
    
    let newAverage, newTotal
    if (currentStats.length === 0) {
      // First rating for this template
      newAverage = rating
      newTotal = 1
    } else {
      const currentAverage = parseFloat(currentStats[0].averageRating)
      const currentTotal = parseInt(currentStats[0].totalRatings)
      
      // Calculate new average
      newTotal = currentTotal + 1
      newAverage = ((currentAverage * currentTotal) + rating) / newTotal
    }

    // Update template statistics
    const turtle = `
      @prefix gv: <https://gitvan.dev/feedback/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      gv:${templateId} rdf:type gv:Template ;
        gv:templateId "${templateId}" ;
        gv:averageRating "${newAverage.toFixed(2)}" ;
        gv:totalRatings "${newTotal}" ;
        gv:lastUpdated "${new Date().toISOString()}" .
    `

    await this.graph.addTurtle(turtle)
  }

  /**
   * Analyze feedback patterns using graph queries
   */
  async analyzePatterns(feedbackData) {
    // Analyze rating patterns by category
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?category (AVG(?rating) as ?avgRating) (COUNT(?rating) as ?count) WHERE {
        ?feedback rdf:type gv:Feedback ;
          gv:category ?category ;
          gv:rating ?rating .
      }
      GROUP BY ?category
    `)

    const categoryPatterns = await this.graph.select()

    // Analyze template performance patterns
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?templateId (AVG(?rating) as ?avgRating) (COUNT(?rating) as ?count) WHERE {
        ?feedback rdf:type gv:Feedback ;
          gv:templateId ?templateId ;
          gv:rating ?rating .
      }
      GROUP BY ?templateId
      HAVING (COUNT(?rating) >= 3)
    `)

    const templatePatterns = await this.graph.select()

    // Store patterns
    const patternId = `pattern_${Date.now()}`
    const turtle = `
      @prefix gv: <https://gitvan.dev/feedback/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

      gv:${patternId} rdf:type gv:Pattern ;
        gv:patternId "${patternId}" ;
        gv:patternType "feedback-analysis" ;
        gv:confidence "0.85" ;
        gv:frequency "${categoryPatterns.length + templatePatterns.length}" ;
        gv:categoryPatterns "${JSON.stringify(categoryPatterns)}" ;
        gv:templatePatterns "${JSON.stringify(templatePatterns)}" ;
        gv:analyzedAt "${new Date().toISOString()}" .
    `

    await this.graph.addTurtle(turtle)
  }

  /**
   * Get feedback for a specific template
   */
  async getTemplateFeedback(templateId, options = {}) {
    await this.initialize()

    const limit = options.limit || 50
    const offset = options.offset || 0

    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?feedbackId ?rating ?comment ?timestamp ?userContext ?templateContext ?category ?tags WHERE {
        ?feedback rdf:type gv:Feedback ;
          gv:templateId "${templateId}" ;
          gv:feedbackId ?feedbackId ;
          gv:rating ?rating ;
          gv:comment ?comment ;
          gv:timestamp ?timestamp ;
          gv:userContext ?userContext ;
          gv:templateContext ?templateContext ;
          gv:category ?category ;
          gv:tags ?tags .
      }
      ORDER BY DESC(?timestamp)
      LIMIT ${limit}
      OFFSET ${offset}
    `)

    const results = await this.graph.select()
    
    return results.map(feedback => ({
      feedbackId: feedback.feedbackId,
      rating: parseInt(feedback.rating),
      comment: feedback.comment,
      timestamp: feedback.timestamp,
      userContext: JSON.parse(feedback.userContext || '{}'),
      templateContext: JSON.parse(feedback.templateContext || '{}'),
      category: feedback.category,
      tags: JSON.parse(feedback.tags || '[]')
    }))
  }

  /**
   * Get template statistics
   */
  async getTemplateStatistics(templateId) {
    await this.initialize()

    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?averageRating ?totalRatings ?lastUpdated WHERE {
        gv:${templateId} rdf:type gv:Template ;
          gv:averageRating ?averageRating ;
          gv:totalRatings ?totalRatings ;
          gv:lastUpdated ?lastUpdated .
      }
    `)

    const results = await this.graph.select()
    
    if (results.length === 0) {
      return {
        templateId,
        averageRating: 0,
        totalRatings: 0,
        lastUpdated: null
      }
    }

    return {
      templateId,
      averageRating: parseFloat(results[0].averageRating),
      totalRatings: parseInt(results[0].totalRatings),
      lastUpdated: results[0].lastUpdated
    }
  }

  /**
   * Get feedback recommendations for template optimization
   */
  async getFeedbackRecommendations(templateId) {
    await this.initialize()

    // Get low-rated feedback for this template
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?comment ?userContext ?templateContext ?category WHERE {
        ?feedback rdf:type gv:Feedback ;
          gv:templateId "${templateId}" ;
          gv:rating ?rating ;
          gv:comment ?comment ;
          gv:userContext ?userContext ;
          gv:templateContext ?templateContext ;
          gv:category ?category .
        FILTER(?rating <= 3)
      }
      ORDER BY ?rating
      LIMIT 10
    `)

    const lowRatedFeedback = await this.graph.select()

    // Get common patterns in negative feedback
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?category (COUNT(?feedback) as ?count) (AVG(?rating) as ?avgRating) WHERE {
        ?feedback rdf:type gv:Feedback ;
          gv:templateId "${templateId}" ;
          gv:category ?category ;
          gv:rating ?rating .
        FILTER(?rating <= 3)
      }
      GROUP BY ?category
      ORDER BY DESC(?count)
    `)

    const categoryPatterns = await this.graph.select()

    // Get improvement suggestions from patterns
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?patternType ?confidence ?frequency WHERE {
        ?pattern rdf:type gv:Pattern ;
          gv:patternType ?patternType ;
          gv:confidence ?confidence ;
          gv:frequency ?frequency .
        FILTER(?confidence >= 0.7)
      }
      ORDER BY DESC(?confidence)
    `)

    const improvementPatterns = await this.graph.select()

    return {
      templateId,
      lowRatedFeedback: lowRatedFeedback.map(f => ({
        comment: f.comment,
        userContext: JSON.parse(f.userContext || '{}'),
        templateContext: JSON.parse(f.templateContext || '{}'),
        category: f.category
      })),
      categoryPatterns: categoryPatterns.map(p => ({
        category: p.category,
        count: parseInt(p.count),
        averageRating: parseFloat(p.avgRating)
      })),
      improvementPatterns: improvementPatterns.map(p => ({
        patternType: p.patternType,
        confidence: parseFloat(p.confidence),
        frequency: parseInt(p.frequency)
      })),
      recommendations: this.generateRecommendations(lowRatedFeedback, categoryPatterns, improvementPatterns)
    }
  }

  /**
   * Generate AI-powered recommendations
   */
  generateRecommendations(lowRatedFeedback, categoryPatterns, improvementPatterns) {
    const recommendations = []

    // Analyze common issues
    const commonIssues = categoryPatterns
      .filter(p => p.count >= 2)
      .map(p => ({
        issue: p.category,
        frequency: p.count,
        severity: p.avgRating <= 2 ? 'high' : 'medium',
        suggestion: this.getSuggestionForCategory(p.category)
      }))

    recommendations.push(...commonIssues)

    // Add pattern-based recommendations
    improvementPatterns.forEach(pattern => {
      recommendations.push({
        issue: `Pattern: ${pattern.patternType}`,
        frequency: pattern.frequency,
        severity: pattern.confidence >= 0.8 ? 'high' : 'medium',
        suggestion: this.getSuggestionForPattern(pattern.patternType)
      })
    })

    return recommendations.sort((a, b) => {
      if (a.severity === 'high' && b.severity !== 'high') return -1
      if (b.severity === 'high' && a.severity !== 'high') return 1
      return b.frequency - a.frequency
    })
  }

  /**
   * Get suggestion for category
   */
  getSuggestionForCategory(category) {
    const suggestions = {
      'performance': 'Consider optimizing template rendering performance',
      'usability': 'Improve template usability and user experience',
      'accuracy': 'Enhance template accuracy and output quality',
      'documentation': 'Add better documentation and examples',
      'error-handling': 'Improve error handling and validation',
      'general': 'General template improvements needed'
    }
    return suggestions[category] || 'Consider general improvements'
  }

  /**
   * Get suggestion for pattern
   */
  getSuggestionForPattern(patternType) {
    const suggestions = {
      'feedback-analysis': 'Analyze feedback patterns for optimization',
      'template-performance': 'Optimize template performance',
      'user-experience': 'Improve user experience',
      'ai-enhancement': 'Enhance AI template generation'
    }
    return suggestions[patternType] || 'Consider pattern-based improvements'
  }

  /**
   * Generate feedback analytics
   */
  async generateAnalytics() {
    await this.initialize()

    // Total feedback count
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT (COUNT(?feedback) as ?totalFeedback) WHERE {
        ?feedback rdf:type gv:Feedback .
      }
    `)
    const totalResult = await this.graph.select()

    // Rating distribution
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?rating (COUNT(?feedback) as ?count) WHERE {
        ?feedback rdf:type gv:Feedback ;
          gv:rating ?rating .
      }
      GROUP BY ?rating
      ORDER BY ?rating
    `)
    const ratingResult = await this.graph.select()

    // Category distribution
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?category (COUNT(?feedback) as ?count) (AVG(?rating) as ?avgRating) WHERE {
        ?feedback rdf:type gv:Feedback ;
          gv:category ?category ;
          gv:rating ?rating .
      }
      GROUP BY ?category
      ORDER BY DESC(?count)
    `)
    const categoryResult = await this.graph.select()

    // Template performance
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/feedback/>
      SELECT ?templateId ?averageRating ?totalRatings WHERE {
        ?template rdf:type gv:Template ;
          gv:templateId ?templateId ;
          gv:averageRating ?averageRating ;
          gv:totalRatings ?totalRatings .
      }
      ORDER BY DESC(?averageRating)
    `)
    const templateResult = await this.graph.select()

    const analytics = {
      totalFeedback: parseInt(totalResult[0]?.totalFeedback || '0'),
      ratingDistribution: ratingResult.reduce((acc, row) => {
        acc[`rating_${row.rating}`] = parseInt(row.count)
        return acc
      }, {}),
      categoryDistribution: categoryResult.map(row => ({
        category: row.category,
        count: parseInt(row.count),
        averageRating: parseFloat(row.avgRating)
      })),
      topTemplates: templateResult.slice(0, 10).map(row => ({
        templateId: row.templateId,
        averageRating: parseFloat(row.averageRating),
        totalRatings: parseInt(row.totalRatings)
      })),
      generatedAt: new Date().toISOString()
    }

    // Create analytics snapshot
    await this.graph.snapshotJSON('analytics', 'feedback-analytics', analytics)

    return analytics
  }

  /**
   * Migrate from legacy JSON feedback to graph
   */
  async migrateFromLegacy(legacyFeedbackPath) {
    try {
      const legacyData = JSON.parse(await fs.readFile(legacyFeedbackPath, 'utf8'))
      
      consola.info(`Migrating ${legacyData.feedback?.size || 0} feedback entries from legacy system`)

      for (const [feedbackId, feedbackData] of legacyData.feedback || new Map()) {
        await this.submitFeedback({
          templateId: feedbackData.templateId,
          rating: feedbackData.rating,
          comment: feedbackData.comment,
          userContext: feedbackData.userContext,
          templateContext: feedbackData.templateContext,
          category: feedbackData.category || 'general',
          tags: feedbackData.tags || [],
          metadata: feedbackData.metadata || {}
        })
      }

      // Create migration snapshot
      await this.graph.snapshotJSON('migration', 'legacy-feedback-to-graph', {
        migratedFeedback: legacyData.feedback?.size || 0,
        timestamp: new Date().toISOString(),
        source: legacyFeedbackPath
      })

      consola.success('Legacy feedback migration completed')
      return { migrated: legacyData.feedback?.size || 0 }
    } catch (error) {
      consola.error('Legacy feedback migration failed:', error.message)
      throw error
    }
  }
}

/**
 * Factory function for graph-based user feedback manager
 */
export function createGraphUserFeedbackManager(options = {}) {
  return new GraphUserFeedbackManager(options)
}

/**
 * Default instance for easy access
 */
export const graphUserFeedback = createGraphUserFeedbackManager()


