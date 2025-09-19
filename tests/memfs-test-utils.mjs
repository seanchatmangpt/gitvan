/**
 * @fileoverview GitVan v2 — MemFS Test Utilities
 *
 * Common utilities for MemFS-based testing to reduce duplication and improve consistency
 */

import { vol } from "memfs";
import { withGitVan } from "../src/core/context.mjs";
import { useGit } from "../src/composables/git.mjs";

/**
 * Create a test environment with MemFS
 * @param {Object} options - Configuration options
 * @param {string} options.testDir - Test directory path (default: "/test-memfs")
 * @param {Object} options.files - Files to create initially
 * @param {boolean} options.initGit - Whether to initialize git repository
 * @param {Object} options.gitConfig - Git configuration
 * @returns {Object} Test environment object
 */
export function createMemFSTestEnvironment(options = {}) {
  const {
    testDir = "/test-memfs",
    files = {},
    initGit = false,
    gitConfig = {
      "user.name": "Test User",
      "user.email": "test@example.com",
    },
  } = options;

  // Create test directory
  vol.mkdirSync(testDir, { recursive: true });

  // Create initial files
  Object.entries(files).forEach(([path, content]) => {
    const fullPath = `${testDir}/${path}`;
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    if (dir !== testDir) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(fullPath, content);
  });

  const env = {
    testDir,
    vol,
    cleanup: () => vol.reset(),
    createFile: (path, content) => {
      const fullPath = `${testDir}/${path}`;
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      if (dir !== testDir) {
        vol.mkdirSync(dir, { recursive: true });
      }
      vol.writeFileSync(fullPath, content);
      return fullPath;
    },
    createDir: (path) => {
      const fullPath = `${testDir}/${path}`;
      vol.mkdirSync(fullPath, { recursive: true });
      return fullPath;
    },
    removeFile: (path) => {
      const fullPath = `${testDir}/${path}`;
      vol.rmSync(fullPath);
    },
    removeDir: (path) => {
      const fullPath = `${testDir}/${path}`;
      vol.rmSync(fullPath, { recursive: true });
    },
    exists: (path) => {
      const fullPath = `${testDir}/${path}`;
      return vol.existsSync(fullPath);
    },
    readFile: (path) => {
      const fullPath = `${testDir}/${path}`;
      return vol.readFileSync(fullPath, "utf8");
    },
    listDir: (path = "") => {
      const fullPath = path ? `${testDir}/${path}` : testDir;
      return vol.readdirSync(fullPath);
    },
  };

  // Initialize git if requested
  if (initGit) {
    env.initGit = async () => {
      await withGitVan({ cwd: testDir }, async () => {
        const git = useGit();
        await git.runVoid(["init"]);
        
        // Set git configuration
        for (const [key, value] of Object.entries(gitConfig)) {
          await git.runVoid(["config", key, value]);
        }
        
        // Create initial commit if files exist
        const initialFiles = Object.keys(files);
        if (initialFiles.length > 0) {
          await git.add(initialFiles);
          await git.commit("Initial commit");
        }
      });
    };
  }

  return env;
}

/**
 * Create a test environment with Git integration
 * @param {Object} options - Configuration options
 * @returns {Object} Test environment with git integration
 */
export function createGitTestEnvironment(options = {}) {
  const env = createMemFSTestEnvironment({
    ...options,
    initGit: true,
  });

  return {
    ...env,
    git: null, // Will be set when needed
    withGit: async (callback) => {
      await withGitVan({ cwd: env.testDir }, async () => {
        env.git = useGit();
        await callback(env.git);
      });
    },
  };
}

/**
 * Helper to run tests with MemFS environment
 * @param {Object} options - Test environment options
 * @param {Function} testFn - Test function to run
 */
export async function withMemFSTestEnvironment(options, testFn) {
  const env = createMemFSTestEnvironment(options);
  try {
    await testFn(env);
  } finally {
    env.cleanup();
  }
}

/**
 * Helper to run tests with Git environment
 * @param {Object} options - Test environment options
 * @param {Function} testFn - Test function to run
 */
export async function withGitTestEnvironment(options, testFn) {
  const env = createGitTestEnvironment(options);
  try {
    await env.initGit();
    await testFn(env);
  } finally {
    env.cleanup();
  }
}

/**
 * Create a complex directory structure for testing
 * @param {string} baseDir - Base directory path
 * @param {Object} structure - Directory structure definition
 */
export function createDirectoryStructure(baseDir, structure) {
  Object.entries(structure).forEach(([path, content]) => {
    const fullPath = `${baseDir}/${path}`;
    
    if (typeof content === "string") {
      // It's a file
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      if (dir !== baseDir) {
        vol.mkdirSync(dir, { recursive: true });
      }
      vol.writeFileSync(fullPath, content);
    } else if (typeof content === "object") {
      // It's a directory
      vol.mkdirSync(fullPath, { recursive: true });
      createDirectoryStructure(fullPath, content);
    }
  });
}

/**
 * Performance testing helper for MemFS operations
 * @param {Function} operation - Operation to test
 * @param {number} iterations - Number of iterations
 * @returns {Object} Performance metrics
 */
export function measureMemFSPerformance(operation, iterations = 1000) {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    operation(i);
  }
  
  const end = performance.now();
  const duration = end - start;
  
  return {
    duration,
    iterations,
    averageTime: duration / iterations,
    operationsPerSecond: (iterations / duration) * 1000,
  };
}

/**
 * Assert that real file system is not affected
 * @param {string} realPath - Path in real file system to check
 * @param {Function} expect - Vitest expect function
 */
export function assertRealFileSystemSafe(realPath, expect) {
  expect(vol.existsSync(realPath)).toBe(false);
}

/**
 * Common test patterns for MemFS
 */
export const MemFSPatterns = {
  /**
   * Test file creation and verification
   */
  testFileCreation: (env, fileName, content, expect) => {
    env.createFile(fileName, content);
    expect(env.exists(fileName)).toBe(true);
    expect(env.readFile(fileName)).toBe(content);
  },

  /**
   * Test directory creation and verification
   */
  testDirectoryCreation: (env, dirName, expect) => {
    env.createDir(dirName);
    expect(env.exists(dirName)).toBe(true);
  },

  /**
   * Test file deletion
   */
  testFileDeletion: (env, fileName, expect) => {
    env.removeFile(fileName);
    expect(env.exists(fileName)).toBe(false);
  },

  /**
   * Test directory deletion
   */
  testDirectoryDeletion: (env, dirName, expect) => {
    env.removeDir(dirName);
    expect(env.exists(dirName)).toBe(false);
  },

  /**
   * Test bulk file operations
   */
  testBulkOperations: (env, fileCount = 100, expect) => {
    const files = {};
    for (let i = 0; i < fileCount; i++) {
      files[`file${i}.txt`] = `Content ${i}`;
    }

    const start = performance.now();
    Object.entries(files).forEach(([name, content]) => {
      env.createFile(name, content);
    });
    const duration = performance.now() - start;

    // Verify all files were created
    for (let i = 0; i < fileCount; i++) {
      expect(env.exists(`file${i}.txt`)).toBe(true);
    }

    return { duration, fileCount };
  },
};

export default {
  createMemFSTestEnvironment,
  createGitTestEnvironment,
  withMemFSTestEnvironment,
  withGitTestEnvironment,
  createDirectoryStructure,
  measureMemFSPerformance,
  assertRealFileSystemSafe,
  MemFSPatterns,
};
