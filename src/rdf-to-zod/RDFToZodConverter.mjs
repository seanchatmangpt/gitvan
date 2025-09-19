/**
 * @fileoverview GitVan v2 — RDF to Zod Converter
 *
 * This module provides conversion of RDF/SPARQL query results into strongly-typed
 * TypeScript objects using Zod schemas. It enables type-safe RDF data processing
 * and validation within the GitVan context.
 *
 * Key Features:
 * - SPARQL query result conversion to Zod-validated objects
 * - Zod schema generation from RDF class definitions
 * - RDF term to JavaScript value conversion
 * - Cardinality-aware field creation
 * - Type-safe RDF data processing
 *
 * @version 2.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { z } from "zod";
import pkg from "n3";
const { N3 } = pkg;

/**
 * RDF to Zod Converter
 *
 * Converts RDF/SPARQL query results into strongly-typed TypeScript objects using Zod schemas.
 * This class provides methods for querying RDF data, generating Zod schemas from RDF class
 * definitions, and validating RDF data against schemas.
 *
 * @class RDFToZodConverter
 * @description Converts RDF/SPARQL query results into Zod-validated objects
 */
export class RDFToZodConverter {
  /**
   * Create RDFToZodConverter instance
   *
   * @constructor
   * @param {Object} [options={}] - Configuration options
   * @param {Object} [options.namespaces] - Additional RDF namespaces
   */
  constructor(options = {}) {
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
   * Convert SPARQL query results to Zod-validated objects
   */
  async queryToZod(query, store, schema) {
    const { QueryEngine } = await import("@comunica/query-sparql");
    const engine = new QueryEngine();

    const results = await engine.queryBindings(query, {
      sources: [store],
    });

    const bindings = [];
    await results.forEach((binding) => {
      const obj = {};
      for (const [key, value] of binding) {
        obj[key] = this.rdfTermToValue(value);
      }
      bindings.push(obj);
    });

    // Validate each binding individually with Zod schema
    const validatedBindings = [];
    for (const binding of bindings) {
      try {
        const validated = schema.parse(binding);
        validatedBindings.push(validated);
      } catch (error) {
        console.warn(`Failed to validate binding:`, error.message);
        // Include original binding with validation error
        validatedBindings.push({
          ...binding,
          _validationError: error.message,
        });
      }
    }

    return validatedBindings;
  }

  /**
   * Generate Zod schema from RDF class definition
   */
  generateSchemaFromClass(classUri, store) {
    const classNode = this.getNode(classUri);
    if (!classNode) {
      throw new Error(`Class not found: ${classUri}`);
    }

    const properties = this.getPropertiesForClass(classNode, store);
    const schemaFields = {};

    for (const prop of properties) {
      const propName = this.getLocalName(prop.property.value);
      const range = this.getPropertyRange(prop.property, store);
      const cardinality = this.getPropertyCardinality(prop.property, store);

      schemaFields[propName] = this.createZodField(range, cardinality);
    }

    return z.object(schemaFields);
  }

  /**
   * Generate Zod schema from SPARQL SELECT query structure
   */
  generateSchemaFromQuery(query) {
    // Parse SPARQL query to extract variable types
    const variables = this.extractSelectVariables(query);
    const schemaFields = {};

    for (const variable of variables) {
      // Default to string, can be enhanced with type inference
      schemaFields[variable] = z.string().optional();
    }

    return z.object(schemaFields);
  }

  /**
   * Convert RDF term to JavaScript value
   */
  rdfTermToValue(term) {
    if (term.termType === "Literal") {
      return this.literalToValue(term);
    } else if (term.termType === "NamedNode") {
      return term.value;
    } else if (term.termType === "BlankNode") {
      return `_:${term.value}`;
    } else if (term.termType === "Variable") {
      return term.value;
    }
    return term.value;
  }

  /**
   * Convert RDF literal to JavaScript value
   */
  literalToValue(literal) {
    const datatype = literal.datatype?.value;

    if (datatype === this.namespaces.xsd + "string") {
      return literal.value;
    } else if (datatype === this.namespaces.xsd + "integer") {
      return parseInt(literal.value, 10);
    } else if (datatype === this.namespaces.xsd + "decimal") {
      return parseFloat(literal.value);
    } else if (datatype === this.namespaces.xsd + "boolean") {
      return literal.value === "true";
    } else if (datatype === this.namespaces.xsd + "dateTime") {
      return new Date(literal.value);
    } else if (datatype === this.namespaces.xsd + "date") {
      return new Date(literal.value);
    }

    return literal.value;
  }

  /**
   * Get properties for a given class
   */
  getPropertiesForClass(classNode, store) {
    const properties = [];

    // Get direct properties
    const directProps = store.getQuads(
      null,
      this.namespaces.rdfs + "domain",
      classNode,
      null
    );

    for (const quad of directProps) {
      properties.push({
        property: quad.subject,
        domain: classNode,
        range: this.getPropertyRange(quad.subject, store),
      });
    }

    // Get inherited properties from superclasses
    const superClasses = store.getQuads(
      classNode,
      this.namespaces.rdfs + "subClassOf",
      null,
      null
    );

    for (const superClassQuad of superClasses) {
      const inheritedProps = this.getPropertiesForClass(
        superClassQuad.object,
        store
      );
      properties.push(...inheritedProps);
    }

    return properties;
  }

  /**
   * Get property range (data type)
   */
  getPropertyRange(propertyNode, store) {
    const rangeQuads = store.getQuads(
      propertyNode,
      this.namespaces.rdfs + "range",
      null,
      null
    );

    if (rangeQuads.length > 0) {
      return rangeQuads[0].object;
    }

    // Default to string if no range specified
    return this.getNode(this.namespaces.xsd + "string");
  }

  /**
   * Get property cardinality
   */
  getPropertyCardinality(propertyNode, store) {
    // Check for cardinality restrictions
    const minCardinality = store.getQuads(
      propertyNode,
      this.namespaces.owl + "minCardinality",
      null,
      null
    );

    const maxCardinality = store.getQuads(
      propertyNode,
      this.namespaces.owl + "maxCardinality",
      null,
      null
    );

    return {
      min:
        minCardinality.length > 0
          ? parseInt(minCardinality[0].object.value, 10)
          : 0,
      max:
        maxCardinality.length > 0
          ? parseInt(maxCardinality[0].object.value, 10)
          : Infinity,
    };
  }

  /**
   * Create Zod field based on range and cardinality
   */
  createZodField(range, cardinality) {
    let field;

    // Determine base type
    if (range.value === this.namespaces.xsd + "string") {
      field = z.string();
    } else if (range.value === this.namespaces.xsd + "integer") {
      field = z.number().int();
    } else if (range.value === this.namespaces.xsd + "decimal") {
      field = z.number();
    } else if (range.value === this.namespaces.xsd + "boolean") {
      field = z.boolean();
    } else if (range.value === this.namespaces.xsd + "dateTime") {
      field = z.date();
    } else if (range.value === this.namespaces.xsd + "date") {
      field = z.date();
    } else {
      // Default to string for unknown types
      field = z.string();
    }

    // Apply cardinality constraints
    if (cardinality.min === 0 && cardinality.max === 1) {
      return field.optional();
    } else if (cardinality.min === 1 && cardinality.max === 1) {
      return field;
    } else if (cardinality.max > 1) {
      return z.array(field);
    } else if (cardinality.min === 0) {
      // If min is 0 and max is not specified, make optional
      return field.optional();
    }

    return field;
  }

  /**
   * Extract SELECT variables from SPARQL query
   */
  extractSelectVariables(query) {
    const selectMatch = query.match(/SELECT\s+(.*?)\s+WHERE/i);
    if (!selectMatch) return [];

    const selectClause = selectMatch[1];
    if (selectClause.includes("*")) {
      // Handle SELECT * - would need to analyze WHERE clause
      return [];
    }

    return selectClause
      .split(/\s+/)
      .filter((varName) => varName.startsWith("?"))
      .map((varName) => varName.substring(1));
  }

  /**
   * Get RDF node by URI
   */
  getNode(uri) {
    return {
      termType: "NamedNode",
      value: uri,
    };
  }

  /**
   * Get local name from URI
   */
  getLocalName(uri) {
    const hashIndex = uri.lastIndexOf("#");
    const slashIndex = uri.lastIndexOf("/");
    const index = Math.max(hashIndex, slashIndex);
    return uri.substring(index + 1);
  }

  /**
   * Convert Knowledge Hook results to Zod-validated objects
   */
  async convertHookResults(hookResults, schema) {
    const validatedResults = [];

    for (const result of hookResults) {
      try {
        const validated = schema.parse(result);
        validatedResults.push(validated);
      } catch (error) {
        console.warn(`Failed to validate hook result:`, error.message);
        // Include original result with validation error
        validatedResults.push({
          ...result,
          _validationError: error.message,
        });
      }
    }

    return validatedResults;
  }

  /**
   * Generate TypeScript types from Zod schemas
   */
  generateTypeScriptTypes(schemas) {
    const typeDefinitions = [];

    for (const [name, schema] of Object.entries(schemas)) {
      const typeName = this.toPascalCase(name);
      typeDefinitions.push(
        `export type ${typeName} = z.infer<typeof ${name}Schema>;`
      );
    }

    return typeDefinitions.join("\n");
  }

  /**
   * Convert string to PascalCase
   */
  toPascalCase(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toUpperCase() : word.toUpperCase();
      })
      .replace(/\s+/g, "");
  }
}

export default RDFToZodConverter;
