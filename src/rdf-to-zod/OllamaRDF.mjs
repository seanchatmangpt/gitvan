/**
 * Ollama RDF Integration
 * AI-powered RDF data processing, validation, and generation using Ollama models
 */

import { ollama } from "ollama-ai-provider-v2";
import { generateText, generateObject, streamText } from "ai";
import { z } from "zod";
import { RDFToZodConverter } from "./RDFToZodConverter.mjs";
import { useGitVan } from "../core/context.mjs";
import { useTurtle } from "../composables/turtle.mjs";

export class OllamaRDF {
  constructor(options = {}) {
    this.model = options.model || "qwen3-coder";
    this.baseURL = options.baseURL || "http://localhost:11434";
    this.rdfToZod = new RDFToZodConverter(options);
    this.namespaces = {
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      owl: "http://www.w3.org/2002/07/owl#",
      xsd: "http://www.w3.org/2001/XMLSchema#",
      gv: "https://gitvan.dev/ontology#",
      gh: "https://gitvan.dev/graph-hook#",
      op: "https://gitvan.dev/op#",
      ...options.namespaces,
    };
  }

  /**
   * Generate RDF ontology from natural language description
   */
  async generateOntology(description, options = {}) {
    const prompt = `Generate a Turtle RDF ontology based on this description: "${description}"

Requirements:
- Use proper RDF prefixes (rdf:, rdfs:, owl:, xsd:)
- Define classes with rdfs:label and rdfs:comment
- Define properties with appropriate domains and ranges
- Use proper cardinality constraints (owl:cardinality, owl:minCardinality, owl:maxCardinality)
- Include data types from XSD namespace
- Follow Turtle syntax conventions

Example structure:
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ex: <http://example.org/> .

ex:ClassName rdf:type owl:Class ;
    rdfs:label "Class Name" ;
    rdfs:comment "Description of the class" .

ex:propertyName rdf:type owl:DatatypeProperty ;
    rdfs:domain ex:ClassName ;
    rdfs:range xsd:string ;
    rdfs:label "Property Name" ;
    owl:cardinality 1 .

Generate the ontology:`;

    const { text } = await generateText({
      model: ollama(this.model),
      prompt,
      temperature: 0.3,
      maxTokens: 2000,
      ...options,
    });

    return text.trim();
  }

  /**
   * Generate SPARQL query from natural language
   */
  async generateSPARQLQuery(description, ontology, options = {}) {
    const prompt = `Given this RDF ontology:

${ontology}

Generate a SPARQL query for: "${description}"

Requirements:
- Use proper SPARQL syntax
- Include all necessary PREFIX declarations
- Use appropriate query type (SELECT, ASK, CONSTRUCT, DESCRIBE)
- Include proper WHERE clause with patterns
- Use meaningful variable names
- Add comments explaining the query

Generate the SPARQL query:`;

    const { text } = await generateText({
      model: ollama(this.model),
      prompt,
      temperature: 0.2,
      maxTokens: 1000,
      ...options,
    });

    return text.trim();
  }

  /**
   * Generate Zod schema from RDF ontology using AI
   */
  async generateZodSchemaFromOntology(ontology, className, options = {}) {
    const prompt = `Given this RDF ontology:

${ontology}

Generate a Zod schema for the class: ${className}

Requirements:
- Use proper Zod syntax
- Handle cardinality constraints (optional, required, arrays)
- Convert RDF data types to appropriate Zod types
- Include proper validation rules
- Use meaningful field names
- Handle inheritance if applicable

Example:
const schema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().optional(),
  skills: z.array(z.string()),
  isActive: z.boolean(),
});

Generate the Zod schema:`;

    const { text } = await generateText({
      model: ollama(this.model),
      prompt,
      temperature: 0.2,
      maxTokens: 1000,
      ...options,
    });

    return text.trim();
  }

  /**
   * Generate RDF data from structured input using AI
   */
  async generateRDFData(data, ontology, options = {}) {
    const prompt = `Given this RDF ontology:

${ontology}

Generate Turtle RDF data for this structured input:

${JSON.stringify(data, null, 2)}

Requirements:
- Use proper Turtle syntax
- Include all necessary PREFIX declarations
- Create proper RDF triples
- Use appropriate data types
- Follow the ontology structure
- Generate realistic URIs

Generate the RDF data:`;

    const { text } = await generateText({
      model: ollama(this.model),
      prompt,
      temperature: 0.3,
      maxTokens: 1500,
      ...options,
    });

    return text.trim();
  }

  /**
   * Validate RDF data using AI-powered analysis
   */
  async validateRDFData(rdfData, ontology, options = {}) {
    const prompt = `Analyze this RDF data against the given ontology:

Ontology:
${ontology}

RDF Data:
${rdfData}

Provide validation analysis including:
1. Syntax validation (Turtle format)
2. Semantic validation (ontology compliance)
3. Data type validation
4. Cardinality constraint validation
5. Recommendations for improvements

Format the response as JSON with validation results and recommendations.`;

    const schema = z.object({
      isValid: z.boolean(),
      syntaxErrors: z.array(z.string()),
      semanticErrors: z.array(z.string()),
      typeErrors: z.array(z.string()),
      cardinalityErrors: z.array(z.string()),
      recommendations: z.array(z.string()),
      score: z.number().min(0).max(100),
    });

    const { object } = await generateObject({
      model: ollama(this.model),
      prompt,
      schema,
      temperature: 0.1,
      ...options,
    });

    return object;
  }

  /**
   * Generate Knowledge Hook definitions using AI
   */
  async generateKnowledgeHook(description, ontology, options = {}) {
    const prompt = `Given this RDF ontology:

${ontology}

Generate a Knowledge Hook definition for: "${description}"

Requirements:
- Use proper Turtle syntax
- Include all necessary PREFIX declarations
- Define hook with gh:Hook type
- Include appropriate predicate (ASK, SELECT, CONSTRUCT, DESCRIBE)
- Add workflow steps if needed
- Use meaningful URIs and labels
- Include proper metadata

Example structure:
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .

ex:myHook rdf:type gh:Hook ;
    gh:id "my-hook" ;
    gh:name "My Hook" ;
    gh:description "Description of the hook" ;
    gh:predicate [
        gh:type "ASK" ;
        gh:query "ASK WHERE { ?s ?p ?o }"
    ] ;
    gh:workflow [
        gh:steps (
            [ op:type "template" ; op:template "Hello {{name}}" ]
        )
    ] .

Generate the Knowledge Hook:`;

    const { text } = await generateText({
      model: ollama(this.model),
      prompt,
      temperature: 0.3,
      maxTokens: 1500,
      ...options,
    });

    return text.trim();
  }

  /**
   * Generate SPARQL query with streaming results
   */
  async *generateSPARQLQueryStream(description, ontology, options = {}) {
    const prompt = `Generate a SPARQL query for: "${description}"

Ontology:
${ontology}

Generate the query step by step:`;

    const { textStream } = await streamText({
      model: ollama(this.model),
      prompt,
      temperature: 0.2,
      maxTokens: 1000,
      ...options,
    });

    for await (const chunk of textStream) {
      yield chunk;
    }
  }

  /**
   * Generate RDF ontology with streaming output
   */
  async *generateOntologyStream(description, options = {}) {
    const prompt = `Generate a Turtle RDF ontology for: "${description}"

Generate it step by step:`;

    const { textStream } = await streamText({
      model: ollama(this.model),
      prompt,
      temperature: 0.3,
      maxTokens: 2000,
      ...options,
    });

    for await (const chunk of textStream) {
      yield chunk;
    }
  }

  /**
   * Generate comprehensive RDF documentation
   */
  async generateRDFDocumentation(ontology, options = {}) {
    const prompt = `Generate comprehensive documentation for this RDF ontology:

${ontology}

Include:
1. Overview and purpose
2. Class descriptions with examples
3. Property descriptions with usage
4. Data type mappings
5. Usage examples
6. Best practices
7. Common patterns

Format as Markdown with clear sections and examples.`;

    const { text } = await generateText({
      model: ollama(this.model),
      prompt,
      temperature: 0.3,
      maxTokens: 3000,
      ...options,
    });

    return text.trim();
  }

  /**
   * Generate RDF data from natural language description
   */
  async generateRDFFromDescription(description, ontology, options = {}) {
    const prompt = `Given this RDF ontology:

${ontology}

Generate realistic RDF data based on this description: "${description}"

Requirements:
- Use proper Turtle syntax
- Include all necessary PREFIX declarations
- Create realistic data that matches the description
- Use appropriate data types
- Follow the ontology structure
- Generate multiple instances if appropriate

Generate the RDF data:`;

    const { text } = await generateText({
      model: ollama(this.model),
      prompt,
      temperature: 0.4,
      maxTokens: 2000,
      ...options,
    });

    return text.trim();
  }

  /**
   * Generate RDF data with validation using AI
   */
  async generateAndValidateRDF(description, ontology, options = {}) {
    // Generate RDF data
    const rdfData = await this.generateRDFFromDescription(
      description,
      ontology,
      options
    );

    // Validate the generated data
    const validation = await this.validateRDFData(rdfData, ontology, options);

    return {
      rdfData,
      validation,
      isValid: validation.isValid,
      score: validation.score,
    };
  }
}

export default OllamaRDF;
