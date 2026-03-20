/**
 * Tests for GitVan Event Router - events.mjs
 * Tests event predicate matching, validation, and routing behavior
 */

import { describe, it, expect } from "vitest";
import { matches, getAvailableMatchers, validatePredicate } from "../../src/router/events.mjs";

describe("Event Router", () => {
  describe("getAvailableMatchers", () => {
    it("should return all registered matcher names", () => {
      const matchers = getAvailableMatchers();
      expect(matchers).toBeInstanceOf(Array);
      expect(matchers.length).toBeGreaterThan(0);
    });

    it("should include path matchers", () => {
      const matchers = getAvailableMatchers();
      expect(matchers).toContain("pathChanged");
      expect(matchers).toContain("pathAdded");
      expect(matchers).toContain("pathModified");
      expect(matchers).toContain("pathDeleted");
    });

    it("should include tag matchers", () => {
      const matchers = getAvailableMatchers();
      expect(matchers).toContain("tagCreate");
      expect(matchers).toContain("semverTag");
      expect(matchers).toContain("tagPrefix");
      expect(matchers).toContain("tagSuffix");
    });

    it("should include merge matchers", () => {
      const matchers = getAvailableMatchers();
      expect(matchers).toContain("mergeTo");
      expect(matchers).toContain("branchCreate");
      expect(matchers).toContain("mergeFrom");
      expect(matchers).toContain("pullRequest");
    });

    it("should include commit matchers", () => {
      const matchers = getAvailableMatchers();
      expect(matchers).toContain("message");
      expect(matchers).toContain("authorEmail");
      expect(matchers).toContain("authorName");
      expect(matchers).toContain("signed");
      expect(matchers).toContain("commitType");
      expect(matchers).toContain("commitScope");
    });
  });

  describe("validatePredicate", () => {
    it("should return invalid for null predicate", () => {
      const result = validatePredicate(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Predicate must be an object");
    });

    it("should return invalid for non-object predicate", () => {
      const result = validatePredicate("not-an-object");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Predicate must be an object");
    });

    it("should return invalid for undefined predicate", () => {
      const result = validatePredicate(undefined);
      expect(result.isValid).toBe(false);
    });

    it("should validate known matchers as valid", () => {
      const result = validatePredicate({ pathChanged: ["*.mjs"] });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should report unknown matchers", () => {
      const result = validatePredicate({ unknownMatcher: "value" });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Unknown matcher: unknownMatcher");
    });

    it("should allow 'any' as a valid key", () => {
      const result = validatePredicate({
        any: [{ pathChanged: ["*.mjs"] }],
      });
      expect(result.isValid).toBe(true);
    });

    it("should allow 'all' as a valid key", () => {
      const result = validatePredicate({
        all: [{ pathChanged: ["*.mjs"] }],
      });
      expect(result.isValid).toBe(true);
    });

    it("should report error when 'any' is not an array", () => {
      const result = validatePredicate({ any: "not-array" });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("'any' must be an array");
    });

    it("should report error when 'all' is not an array", () => {
      const result = validatePredicate({ all: "not-array" });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("'all' must be an array");
    });

    it("should validate empty predicate as valid", () => {
      const result = validatePredicate({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should report multiple errors", () => {
      const result = validatePredicate({
        unknownA: "a",
        unknownB: "b",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  describe("matches", () => {
    describe("basic matching", () => {
      it("should return false for null predicate", () => {
        expect(matches(null, {})).toBe(false);
      });

      it("should return false for undefined predicate", () => {
        expect(matches(undefined, {})).toBe(false);
      });

      it("should return false for non-object predicate", () => {
        expect(matches("string", {})).toBe(false);
      });

      it("should return false for empty predicate with no any/all", () => {
        expect(matches({}, {})).toBe(false);
      });
    });

    describe("path matching", () => {
      it("should match pathChanged with glob patterns", () => {
        const predicate = { pathChanged: ["*.mjs"] };
        const meta = { filesChanged: ["events.mjs"] };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should not match pathChanged when no files match", () => {
        const predicate = { pathChanged: ["*.mjs"] };
        const meta = { filesChanged: ["readme.md"] };
        expect(matches(predicate, meta)).toBe(false);
      });

      it("should match pathAdded", () => {
        const predicate = { pathAdded: ["*.test.mjs"] };
        const meta = { filesAdded: ["events.test.mjs"] };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should match pathModified", () => {
        const predicate = { pathModified: ["*.json"] };
        const meta = { filesModified: ["package.json"] };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should match pathDeleted", () => {
        const predicate = { pathDeleted: ["*.tmp"] };
        const meta = { filesDeleted: ["cache.tmp"] };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should not match when files array is empty", () => {
        const predicate = { pathChanged: ["*.mjs"] };
        const meta = { filesChanged: [] };
        expect(matches(predicate, meta)).toBe(false);
      });

      it("should not match when files array is missing", () => {
        const predicate = { pathChanged: ["*.mjs"] };
        const meta = {};
        expect(matches(predicate, meta)).toBe(false);
      });
    });

    describe("tag matching", () => {
      it("should match tagCreate with pattern", () => {
        const predicate = { tagCreate: "^v\\d+" };
        const meta = { tagsCreated: ["v1.0.0"] };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should match semverTag", () => {
        const predicate = { semverTag: true };
        const meta = { tagsCreated: ["v1.2.3"] };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should not match semverTag for non-semver tags", () => {
        const predicate = { semverTag: true };
        const meta = { tagsCreated: ["latest"] };
        expect(matches(predicate, meta)).toBe(false);
      });

      it("should match tagPrefix", () => {
        const predicate = { tagPrefix: "release-" };
        const meta = { tagsCreated: ["release-1.0"] };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should match tagSuffix", () => {
        const predicate = { tagSuffix: "-beta" };
        const meta = { tagsCreated: ["v1.0.0-beta"] };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should not match tagPrefix when no tags", () => {
        const predicate = { tagPrefix: "v" };
        const meta = {};
        expect(matches(predicate, meta)).toBe(false);
      });
    });

    describe("merge matching", () => {
      it("should match mergeTo", () => {
        const predicate = { mergeTo: "main" };
        const meta = { mergedTo: "main" };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should not match mergeTo when branch differs", () => {
        const predicate = { mergeTo: "main" };
        const meta = { mergedTo: "develop" };
        expect(matches(predicate, meta)).toBe(false);
      });

      it("should match branchCreate", () => {
        const predicate = { branchCreate: "feature/.*" };
        const meta = { branchCreated: "feature/new-feature" };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should match mergeFrom", () => {
        const predicate = { mergeFrom: "feature/.*" };
        const meta = { mergedFrom: "feature/auth" };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should match pullRequest", () => {
        const predicate = { pullRequest: true };
        const meta = { pullRequest: { id: 123, title: "Fix bug" } };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should not match pullRequest when false", () => {
        const predicate = { pullRequest: true };
        const meta = {};
        expect(matches(predicate, meta)).toBe(false);
      });
    });

    describe("commit matching", () => {
      it("should match message pattern", () => {
        const predicate = { message: "fix:" };
        const meta = { message: "fix: resolve broken test" };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should match authorEmail", () => {
        const predicate = { authorEmail: "@example\\.com" };
        const meta = { authorEmail: "dev@example.com" };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should match authorName", () => {
        const predicate = { authorName: "John" };
        const meta = { authorName: "John Doe" };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should match signed commits", () => {
        const predicate = { signed: true };
        const meta = { signed: true };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should not match unsigned commits when signed required", () => {
        const predicate = { signed: true };
        const meta = { signed: false };
        expect(matches(predicate, meta)).toBe(false);
      });

      it("should match commitType", () => {
        const predicate = { commitType: "feat" };
        const meta = { message: "feat(router): add event matching" };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should match commitScope", () => {
        const predicate = { commitScope: "router" };
        const meta = { message: "feat(router): add event matching" };
        expect(matches(predicate, meta)).toBe(true);
      });
    });

    describe("any (OR) logic", () => {
      it("should match when any sub-predicate matches", () => {
        const predicate = {
          any: [
            { pathChanged: ["*.ts"] },
            { tagCreate: "^v" },
          ],
        };
        const meta = { tagsCreated: ["v1.0.0"] };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should not match when no sub-predicates match", () => {
        const predicate = {
          any: [
            { pathChanged: ["*.ts"] },
            { tagCreate: "^v" },
          ],
        };
        const meta = { filesChanged: ["readme.md"] };
        expect(matches(predicate, meta)).toBe(false);
      });

      it("should handle empty any array", () => {
        const predicate = { any: [] };
        expect(matches(predicate, {})).toBe(false);
      });
    });

    describe("all (AND) logic", () => {
      it("should match when all sub-predicates match", () => {
        const predicate = {
          all: [
            { pathChanged: ["*.mjs"] },
            { message: "feat:" },
          ],
        };
        const meta = {
          filesChanged: ["index.mjs"],
          message: "feat: add new feature",
        };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should not match when not all sub-predicates match", () => {
        const predicate = {
          all: [
            { pathChanged: ["*.mjs"] },
            { message: "feat:" },
          ],
        };
        const meta = {
          filesChanged: ["index.mjs"],
          message: "fix: bug",
        };
        expect(matches(predicate, meta)).toBe(false);
      });

      it("should handle empty all array", () => {
        const predicate = { all: [] };
        expect(matches(predicate, {})).toBe(false);
      });
    });

    describe("nested predicates", () => {
      it("should handle nested any within all", () => {
        const predicate = {
          all: [
            {
              any: [
                { pathChanged: ["*.mjs"] },
                { pathChanged: ["*.ts"] },
              ],
            },
            { message: "feat:" },
          ],
        };
        const meta = {
          filesChanged: ["utils.mjs"],
          message: "feat: new utility",
        };
        expect(matches(predicate, meta)).toBe(true);
      });
    });

    describe("multiple matcher keys", () => {
      it("should return true if any individual matcher matches", () => {
        const predicate = {
          pathChanged: ["*.mjs"],
          tagCreate: "^v",
        };
        const meta = { filesChanged: ["index.mjs"] };
        expect(matches(predicate, meta)).toBe(true);
      });

      it("should handle unknown matcher keys gracefully", () => {
        const predicate = { unknownMatcher: "value" };
        expect(matches(predicate, {})).toBe(false);
      });
    });
  });
});
