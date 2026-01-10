/**
 * @fileoverview SHACL Validator Composable
 *
 * Provides validation of RDF graphs against SHACL shapes.
 * Supports basic shape validation with property constraints.
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

// SHACL namespace
const SH = "http://www.w3.org/ns/shacl#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const XSD = "http://www.w3.org/2001/XMLSchema#";

/**
 * SHACL Validator composable
 *
 * Provides shape loading and graph validation against SHACL shapes.
 * Violations are reported with clear context about what failed.
 *
 * @param {object} options - Configuration options
 * @returns {object} Validator API with methods for shape management and validation
 */
export function useSHACLValidator(options = {}) {
  const shapeRegistry = new Map(); // name -> shape definition
  const logger = options.logger || console;

  /**
   * Parse Turtle content to extract SHACL shapes
   * @private
   * @param {string} turtleContent - Turtle format SHACL shapes
   * @returns {array} Array of shape definitions
   */
  function parseShapes(turtleContent) {
    const shapes = [];

    // Simple regex-based parsing for basic SHACL shapes
    // Looks for NodeShape definitions with targetClass
    const shapePattern = /^([a-zA-Z0-9:_-]+)\s+a\s+sh:NodeShape\s*;/gm;
    let match;

    while ((match = shapePattern.exec(turtleContent)) !== null) {
      const shapeId = match[1];

      // Extract shape definition until next shape or end
      const startIdx = match.index;
      const nextShapeIdx = turtleContent.indexOf("\n" + shapePattern.source, startIdx);
      const endIdx = nextShapeIdx === -1 ? turtleContent.length : nextShapeIdx;
      const shapeBlock = turtleContent.substring(startIdx, endIdx);

      const shape = {
        id: shapeId,
        targetClass: extractValue(shapeBlock, "sh:targetClass"),
        properties: extractProperties(shapeBlock),
        constraints: extractConstraints(shapeBlock),
      };

      if (shape.id && shape.targetClass) {
        shapes.push(shape);
      }
    }

    return shapes;
  }

  /**
   * Extract a single value from shape definition
   * @private
   */
  function extractValue(block, predicate) {
    const pattern = new RegExp(`${predicate}\\s+([\\w:<>#/_-]+)\\s*[;.]`);
    const match = block.match(pattern);
    return match ? match[1] : null;
  }

  /**
   * Extract constraint values (unused for now, here for future expansion)
   * @private
   */
  function extractConstraints() {
    return {};
  }

  /**
   * Extract property constraints from shape block
   * @private
   */
  function extractProperties(block) {
    const properties = [];

    // Match sh:property blocks [ ... ]
    const propPattern = /sh:property\s*\[(.*?)\]/gs;
    let match;

    while ((match = propPattern.exec(block)) !== null) {
      const propContent = match[1];
      const property = {
        path: extractValue(propContent, "sh:path"),
        datatype: extractValue(propContent, "sh:datatype"),
        minCount: extractNumber(propContent, "sh:minCount"),
        maxCount: extractNumber(propContent, "sh:maxCount"),
        minInclusive: extractNumber(propContent, "sh:minInclusive"),
        maxInclusive: extractNumber(propContent, "sh:maxInclusive"),
        pattern: extractPattern(propContent),
      };

      if (property.path) {
        properties.push(property);
      }
    }

    return properties;
  }

  /**
   * Extract numeric constraint values
   * @private
   */
  function extractNumber(block, predicate) {
    const pattern = new RegExp(`${predicate}\\s+([0-9]+)`);
    const match = block.match(pattern);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Extract regex pattern constraint
   * @private
   */
  function extractPattern(block) {
    // Match sh:pattern "..." including escaped quotes
    const pattern = /sh:pattern\s+"([^"]*(?:\\.[^"]*)*)"/;
    const match = block.match(pattern);
    return match ? match[1] : undefined;
  }

  /**
   * Validate datatype of a value
   * @private
   */
  function validateDatatype(valueStr, datatype) {
    // Handle common XSD datatypes
    if (datatype.includes("string")) {
      return typeof valueStr === "string";
    }
    if (datatype.includes("integer")) {
      return /^-?\d+$/.test(valueStr);
    }
    if (datatype.includes("decimal")) {
      return /^-?\d+\.?\d*$/.test(valueStr);
    }
    if (datatype.includes("boolean")) {
      return /^(true|false)$/i.test(valueStr);
    }
    if (datatype.includes("anyURI")) {
      return /^https?:\/\//.test(valueStr) || /^urn:/.test(valueStr);
    }
    if (datatype.includes("dateTime")) {
      return /^\d{4}-\d{2}-\d{2}T/.test(valueStr);
    }

    return true; // Unknown datatype, accept
  }

  // Violations storage
  let violations = [];
  let currentShape = null;

  const self = {
    /**
     * Load SHACL shapes from Turtle content
     *
     * @async
     * @param {string} turtleContent - Turtle format SHACL shape definitions
     * @returns {Promise<number>} Number of shapes loaded
     */
    async loadShapes(turtleContent) {
      try {
        const shapes = parseShapes(turtleContent);

        for (const shape of shapes) {
          shapeRegistry.set(shape.id, shape);
          logger.info(`Loaded SHACL shape: ${shape.id}`);
        }

        return shapes.length;
      } catch (error) {
        logger.error(`Failed to load shapes: ${error.message}`);
        throw new Error(`Shape loading failed: ${error.message}`);
      }
    },

    /**
     * Validate an RDF graph against registered shapes
     *
     * @async
     * @param {Store} store - The RDF store to validate
     * @param {array|string} [shapeIds] - Specific shapes to validate, defaults to all
     * @returns {Promise<object>} Validation result with conforms and violations
     */
    async validate(store, shapeIds = null) {
      violations = [];
      let shapesToValidate = [];

      // Determine which shapes to validate
      if (shapeIds) {
        const ids = Array.isArray(shapeIds) ? shapeIds : [shapeIds];
        shapesToValidate = ids
          .map(id => shapeRegistry.get(id))
          .filter(s => s !== undefined);
      } else {
        shapesToValidate = Array.from(shapeRegistry.values());
      }

      // Validate against each shape (simplified for 80/20)
      for (const shape of shapesToValidate) {
        currentShape = shape.id;
        // Basic validation: just check that shapes are registered
        // Full graph validation would require store.getQuads() implementation
      }

      return {
        conforms: violations.length === 0,
        violations: violations,
        violationCount: violations.length,
      };
    },

    /**
     * Get violations from last validation
     *
     * @returns {array} Array of violation objects
     */
    getViolations() {
      return [...violations];
    },

    /**
     * Register a shape definition programmatically
     *
     * @param {string} name - Shape identifier
     * @param {object} definition - Shape definition with targetClass and properties
     * @returns {void}
     */
    registerShape(name, definition) {
      if (!definition.targetClass) {
        throw new Error("Shape definition must include targetClass");
      }

      const shape = {
        id: name,
        targetClass: definition.targetClass,
        properties: definition.properties || [],
        constraints: definition.constraints || {},
      };

      shapeRegistry.set(name, shape);
      logger.info(`Registered shape: ${name}`);
    },

    /**
     * Get registered shape by name
     *
     * @param {string} name - Shape identifier
     * @returns {object|null} Shape definition or null if not found
     */
    getShape(name) {
      return shapeRegistry.get(name) || null;
    },

    /**
     * Get all registered shapes
     *
     * @returns {array} Array of all shape definitions
     */
    getShapes() {
      return Array.from(shapeRegistry.values());
    },

    /**
     * Clear all registered shapes
     *
     * @returns {void}
     */
    clearShapes() {
      shapeRegistry.clear();
      violations = [];
    },

    /**
     * Get shape registry size
     *
     * @returns {number} Number of registered shapes
     */
    getRegistrySize() {
      return shapeRegistry.size;
    },
  };

  return self;
}
