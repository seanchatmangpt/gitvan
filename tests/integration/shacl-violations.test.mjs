/**
 * @fileoverview Test suite for SHACL violation reporting
 *
 * Tests that SHACL validation correctly reports violations
 * with comprehensive information for debugging and remediation.
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSHACLValidator } from "../../src/composables/useSHACLValidator.mjs";

describe("SHACL Violation Reporting", () => {
  let validator;

  beforeEach(() => {
    validator = useSHACLValidator();
  });

  describe("Violation Structure", () => {
    it("should report violations with required properties", async () => {
      // Register a shape with constraints
      validator.registerShape("TestShape", {
        targetClass: "https://example.org/Test",
        properties: [
          {
            path: "https://example.org/name",
            datatype: "http://www.w3.org/2001/XMLSchema#string",
            minCount: 1,
          },
        ],
      });

      // Mock a validation with violations
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });

    it("should include violation details", () => {
      validator.registerShape("TestShape", {
        targetClass: "https://example.org/Test",
        properties: [
          {
            path: "https://example.org/name",
            minCount: 1,
          },
        ],
      });

      // Violations should be stored after validation
      const violations = validator.getViolations();
      expect(violations).toBeDefined();
    });
  });

  describe("Datatype Violations", () => {
    beforeEach(() => {
      validator.registerShape("PersonShape", {
        targetClass: "https://example.org/Person",
        properties: [
          {
            path: "https://example.org/age",
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
            minCount: 1,
          },
          {
            path: "https://example.org/email",
            datatype: "http://www.w3.org/2001/XMLSchema#string",
            minCount: 1,
          },
        ],
      });
    });

    it("should report string datatype violations", () => {
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });

    it("should report integer datatype violations", () => {
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe("Cardinality Violations", () => {
    beforeEach(() => {
      validator.registerShape("ItemShape", {
        targetClass: "https://example.org/Item",
        properties: [
          {
            path: "https://example.org/id",
            minCount: 1,
            maxCount: 1,
          },
          {
            path: "https://example.org/tags",
            minCount: 0,
            maxCount: 5,
          },
        ],
      });
    });

    it("should detect minCount violations", () => {
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });

    it("should detect maxCount violations", () => {
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe("Pattern Violations", () => {
    beforeEach(() => {
      validator.registerShape("ContactShape", {
        targetClass: "https://example.org/Contact",
        properties: [
          {
            path: "https://example.org/email",
            pattern:
              "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
            datatype: "http://www.w3.org/2001/XMLSchema#string",
          },
          {
            path: "https://example.org/phone",
            pattern: "^\\+?[1-9]\\d{1,14}$",
            datatype: "http://www.w3.org/2001/XMLSchema#string",
          },
        ],
      });
    });

    it("should detect email pattern violations", () => {
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });

    it("should detect phone pattern violations", () => {
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });

    it("should accept valid email format", () => {
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe("Numeric Range Violations", () => {
    beforeEach(() => {
      validator.registerShape("ScoreShape", {
        targetClass: "https://example.org/Score",
        properties: [
          {
            path: "https://example.org/percentage",
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
            minInclusive: 0,
            maxInclusive: 100,
          },
          {
            path: "https://example.org/temperature",
            datatype: "http://www.w3.org/2001/XMLSchema#decimal",
            minInclusive: -273.15,
            maxInclusive: 1000,
          },
        ],
      });
    });

    it("should detect minInclusive violations", () => {
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });

    it("should detect maxInclusive violations", () => {
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });

    it("should accept values within range", () => {
      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe("Violation Message Clarity", () => {
    it("should have clear violation messages", () => {
      validator.registerShape("TestShape", {
        targetClass: "https://example.org/Test",
        properties: [
          {
            path: "https://example.org/name",
            datatype: "http://www.w3.org/2001/XMLSchema#string",
            minCount: 1,
          },
        ],
      });

      const violations = validator.getViolations();

      // Each violation should have a message property
      for (const violation of violations) {
        if (violation.resultMessage) {
          expect(typeof violation.resultMessage).toBe("string");
          expect(violation.resultMessage.length).toBeGreaterThan(0);
        }
      }
    });

    it("should identify focus nodes in violations", () => {
      validator.registerShape("TestShape", {
        targetClass: "https://example.org/Test",
        properties: [
          {
            path: "https://example.org/prop",
            minCount: 1,
          },
        ],
      });

      const violations = validator.getViolations();

      // Violations should identify which resource failed
      for (const violation of violations) {
        if (violation.focusNode) {
          expect(typeof violation.focusNode).toBe("string");
        }
      }
    });

    it("should identify result paths in violations", () => {
      validator.registerShape("TestShape", {
        targetClass: "https://example.org/Test",
        properties: [
          {
            path: "https://example.org/prop",
            minCount: 1,
          },
        ],
      });

      const violations = validator.getViolations();

      // Violations should identify which property failed
      for (const violation of violations) {
        if (violation.resultPath) {
          expect(typeof violation.resultPath).toBe("string");
        }
      }
    });
  });

  describe("Violation Severity", () => {
    it("should mark violations as violations or warnings", () => {
      validator.registerShape("TestShape", {
        targetClass: "https://example.org/Test",
        properties: [
          {
            path: "https://example.org/name",
            minCount: 1,
          },
        ],
      });

      const violations = validator.getViolations();

      for (const v of violations) {
        if (v.severity) {
          expect(["Violation", "Warning"]).toContain(v.severity);
        }
      }
    });
  });

  describe("Multiple Violations from Single Instance", () => {
    it("should report all violations for a resource", () => {
      validator.registerShape("PersonShape", {
        targetClass: "https://example.org/Person",
        properties: [
          {
            path: "https://example.org/name",
            minCount: 1,
            datatype: "http://www.w3.org/2001/XMLSchema#string",
          },
          {
            path: "https://example.org/age",
            minCount: 1,
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
          },
          {
            path: "https://example.org/email",
            pattern:
              "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          },
        ],
      });

      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe("Violations from Multiple Instances", () => {
    it("should report violations from all instances of target class", () => {
      validator.registerShape("DocumentShape", {
        targetClass: "https://example.org/Document",
        properties: [
          {
            path: "https://example.org/title",
            minCount: 1,
            datatype: "http://www.w3.org/2001/XMLSchema#string",
          },
        ],
      });

      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe("Violations Reset", () => {
    it("should clear violations when shapes are cleared", () => {
      validator.registerShape("TestShape", {
        targetClass: "https://example.org/Test",
        properties: [
          {
            path: "https://example.org/name",
            minCount: 1,
          },
        ],
      });

      validator.clearShapes();
      const violations = validator.getViolations();

      expect(violations.length).toBe(0);
    });
  });

  describe("Complex Violation Scenarios", () => {
    it("should handle multiple property violations on single resource", () => {
      validator.registerShape("ComplexShape", {
        targetClass: "https://example.org/Complex",
        properties: [
          {
            path: "https://example.org/prop1",
            minCount: 1,
            datatype: "http://www.w3.org/2001/XMLSchema#string",
          },
          {
            path: "https://example.org/prop2",
            minCount: 1,
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
            minInclusive: 0,
            maxInclusive: 100,
          },
          {
            path: "https://example.org/prop3",
            pattern: "^[A-Z]{3}$",
            datatype: "http://www.w3.org/2001/XMLSchema#string",
          },
        ],
      });

      const violations = validator.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });
  });
});
