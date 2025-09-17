/**
 * GitVan Job Validator - Ensures generated jobs actually work
 * Validates job structure, syntax, and execution capability
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "pathe";
import { JobWithValuesSchema } from "../schemas/job-template.zod.mjs";

/**
 * Validate a generated job file
 * @param {string} jobFilePath - Path to the job file
 * @returns {Promise<object>} Validation result
 */
export async function validateJobFile(jobFilePath) {
  const result = {
    valid: false,
    errors: [],
    warnings: [],
    suggestions: [],
    testable: false,
    executionResult: null,
  };

  try {
    // 1. Check if file exists
    if (!existsSync(jobFilePath)) {
      result.errors.push("Job file does not exist");
      return result;
    }

    // 2. Read and parse the file
    const jobContent = readFileSync(jobFilePath, "utf8");

    // 3. Validate syntax
    const syntaxResult = validateJobSyntax(jobContent);
    result.errors.push(...syntaxResult.errors);
    result.warnings.push(...syntaxResult.warnings);

    // 4. Validate structure
    const structureResult = validateJobStructure(jobContent);
    result.errors.push(...structureResult.errors);
    result.warnings.push(...structureResult.warnings);

    // 5. Check for required imports and dependencies
    const dependencyResult = validateJobDependencies(jobContent);
    result.errors.push(...dependencyResult.errors);
    result.warnings.push(...dependencyResult.warnings);

    // 6. Test job execution (if possible)
    if (result.errors.length === 0) {
      result.testable = true;
      try {
        const executionResult = await testJobExecution(jobFilePath);
        result.executionResult = executionResult;
        if (!executionResult.success) {
          result.errors.push(`Job execution failed: ${executionResult.error}`);
        }
      } catch (error) {
        result.warnings.push(`Could not test execution: ${error.message}`);
      }
    }

    result.valid = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(`Validation failed: ${error.message}`);
    return result;
  }
}

/**
 * Validate job syntax
 * @param {string} content - Job file content
 * @returns {object} Syntax validation result
 */
function validateJobSyntax(content) {
  const result = { errors: [], warnings: [] };

  try {
    // Check for basic JavaScript syntax
    if (!content.includes("export default")) {
      result.errors.push("Job must export a default object");
    }

    if (!content.includes("async run(")) {
      result.errors.push("Job must have an async run function");
    }

    // Check for proper return structure
    if (!content.includes("return {") || !content.includes("ok:")) {
      result.errors.push("Job must return an object with 'ok' property");
    }

    // Check for try/catch error handling
    if (!content.includes("try {") || !content.includes("catch")) {
      result.warnings.push("Job should include try/catch error handling");
    }

    // Check for console.log statements
    if (!content.includes("console.log")) {
      result.warnings.push("Job should include logging statements");
    }
  } catch (error) {
    result.errors.push(`Syntax validation failed: ${error.message}`);
  }

  return result;
}

/**
 * Validate job structure
 * @param {string} content - Job file content
 * @returns {object} Structure validation result
 */
function validateJobStructure(content) {
  const result = { errors: [], warnings: [] };

  // Check for meta object
  if (!content.includes("meta:")) {
    result.errors.push("Job must include meta object with description");
  }

  // Check for proper parameter destructuring
  if (!content.includes("{ ctx, payload, meta }")) {
    result.warnings.push(
      "Job should destructure { ctx, payload, meta } parameters"
    );
  }

  // Check for artifacts in return
  if (!content.includes("artifacts:")) {
    result.warnings.push("Job should return artifacts array");
  }

  return result;
}

/**
 * Validate job dependencies
 * @param {string} content - Job file content
 * @returns {object} Dependency validation result
 */
function validateJobDependencies(content) {
  const result = { errors: [], warnings: [] };

  // Check for GitVan composable imports
  const composableImports = [
    "gitvan/composables/git",
    "gitvan/composables/template",
    "gitvan/composables/pack",
  ];

  let hasComposableImports = false;
  for (const importPath of composableImports) {
    if (content.includes(importPath)) {
      hasComposableImports = true;
      break;
    }
  }

  if (!hasComposableImports) {
    result.warnings.push(
      "Job doesn't use GitVan composables - consider using useGit, useTemplate, or usePack"
    );
  }

  // Check for Node.js imports
  if (
    content.includes("import('fs')") ||
    content.includes("import('fs/promises')")
  ) {
    result.warnings.push(
      "Job uses Node.js fs module - ensure proper error handling"
    );
  }

  return result;
}

/**
 * Test job execution with mock data
 * @param {string} jobFilePath - Path to job file
 * @returns {Promise<object>} Execution test result
 */
async function testJobExecution(jobFilePath) {
  try {
    // Create a temporary test file with mock context
    const testContent = `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock GitVan composables
const mockGit = {
  head: () => Promise.resolve('test-commit'),
  noteAppend: (ref, content) => Promise.resolve(),
  log: (options) => Promise.resolve([])
};

const mockTemplate = {
  plan: (template, data) => Promise.resolve({ operations: [] }),
  apply: (plan) => Promise.resolve({ status: 'OK' }),
  renderString: (template, data) => Promise.resolve('rendered content')
};

const mockPack = {
  apply: (packName, inputs) => Promise.resolve({ success: true })
};

// Mock context
const mockContext = {
  root: process.cwd(),
  cwd: process.cwd(),
  head: () => Promise.resolve('test-commit'),
  now: () => new Date().toISOString(),
  git: mockGit
};

// Mock payload
const mockPayload = {
  testParam: 'test-value',
  sourcePath: './test',
  destinationPath: './backup'
};

// Import and test the job
const jobModule = await import('file://${jobFilePath}');
const job = jobModule.default;

if (!job || typeof job.run !== 'function') {
  throw new Error('Job does not export a valid run function');
}

// Execute the job
const result = await job.run({
  ctx: mockContext,
  payload: mockPayload,
  meta: job.meta || {}
});

return {
  success: true,
  result: result,
  executionTime: Date.now()
};

`;

    // Write test file
    const testFilePath = jobFilePath.replace(".mjs", ".test.mjs");
    writeFileSync(testFilePath, testContent);

    // Execute test
    const { execSync } = await import("node:child_process");
    const output = execSync(`node ${testFilePath}`, {
      encoding: "utf8",
      timeout: 10000, // 10 second timeout
    });

    // Clean up test file
    const { unlinkSync } = await import("node:fs");
    unlinkSync(testFilePath);

    return {
      success: true,
      output: output,
      message: "Job executed successfully with mock data",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Job execution test failed",
    };
  }
}

/**
 * Generate a working job from template
 * @param {object} jobTemplate - Job template with values
 * @returns {Promise<object>} Generation result
 */
export async function generateWorkingJob(jobTemplate) {
  try {
    // Validate template
    const validatedTemplate = JobWithValuesSchema.parse(jobTemplate);

    // Generate job code
    const { generateJobFromTemplate } = await import(
      "../templates/job-templates.mjs"
    );
    const jobCode = generateJobFromTemplate(validatedTemplate);

    // Validate generated code
    const validation = await validateJobCode(jobCode);

    return {
      success: validation.valid,
      jobCode: jobCode,
      validation: validation,
      template: validatedTemplate,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      template: jobTemplate,
    };
  }
}

/**
 * Validate job code string
 * @param {string} jobCode - Generated job code
 * @returns {Promise<object>} Validation result
 */
async function validateJobCode(jobCode) {
  // Write to temporary file and validate
  const tempPath = join(
    process.cwd(),
    ".gitvan",
    "temp",
    `job-${Date.now()}.mjs`
  );

  try {
    const { mkdirSync, writeFileSync, unlinkSync } = await import("node:fs");
    const { dirname } = await import("node:path");

    mkdirSync(dirname(tempPath), { recursive: true });
    writeFileSync(tempPath, jobCode);

    const validation = await validateJobFile(tempPath);

    // Clean up
    unlinkSync(tempPath);

    return validation;
  } catch (error) {
    return {
      valid: false,
      errors: [`Code validation failed: ${error.message}`],
      warnings: [],
      suggestions: [],
      testable: false,
    };
  }
}

/**
 * Create a comprehensive job test suite
 * @param {string} jobFilePath - Path to job file
 * @returns {Promise<object>} Test suite result
 */
export async function createJobTestSuite(jobFilePath) {
  const tests = {
    syntax: false,
    structure: false,
    dependencies: false,
    execution: false,
    errorHandling: false,
    overall: false,
  };

  try {
    const validation = await validateJobFile(jobFilePath);

    tests.syntax = !validation.errors.some((e) => e.includes("syntax"));
    tests.structure = !validation.errors.some((e) => e.includes("structure"));
    tests.dependencies = !validation.errors.some((e) =>
      e.includes("dependencies")
    );
    tests.execution = validation.executionResult?.success || false;
    tests.errorHandling = validation.warnings.some((w) =>
      w.includes("try/catch")
    );
    tests.overall = validation.valid && tests.execution;

    return {
      success: tests.overall,
      tests: tests,
      validation: validation,
      score:
        Object.values(tests).filter(Boolean).length / Object.keys(tests).length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      tests: tests,
      score: 0,
    };
  }
}
