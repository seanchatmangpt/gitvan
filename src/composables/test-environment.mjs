/**
 * Test Environment Composable for GitVan
 *
 * Provides a unified interface for creating test environments with:
 * - MemFS for safe file operations
 * - Real temporary directories for Git operations
 * - GitVan context management
 * - Automatic cleanup
 */

import { vol } from "memfs";
import { execSync } from "child_process";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { withGitVan } from "../core/context.mjs";
import { useGit } from "./git.mjs";
import { useFileSystem } from "./filesystem.mjs";
import { useTemplate } from "./template.mjs";
import { useHybridGit, TestEnvironmentFactory } from "./hybrid-git.mjs";

/**
 * Creates a test environment with MemFS and Git integration
 * @param {Object} options - Configuration options
 * @param {string} options.testName - Unique name for the test environment
 * @param {Object} options.initialFiles - Files to create initially
 * @param {Object} options.gitConfig - Git configuration options
 * @param {boolean} options.initGit - Whether to initialize Git repository
 * @param {string} options.backend - Git backend type: "native", "memfs", "hybrid", or "auto"
 * @param {Function} testFn - Test function to run with the environment
 */
export async function withTestEnvironment(options, testFn) {
  const {
    testName = "test-environment",
    initialFiles = {},
    gitConfig = {},
    initGit = true,
    backend = "auto",
  } = options;

  // Initialize hybrid Git environment
  let hybridGit = null;
  let realTestDir = null;
  let memfsTestDir = null;

  try {
    // Create hybrid Git environment based on backend type
    if (backend === "memfs") {
      hybridGit = await TestEnvironmentFactory.createMemFSEnvironment({
        testName,
        ...gitConfig,
      });
      memfsTestDir = hybridGit.options.memfsDir;
    } else if (backend === "native") {
      realTestDir = await mkdtemp(join(tmpdir(), `gitvan-${testName}-`));
      hybridGit = await TestEnvironmentFactory.createNativeEnvironment({
        testDir: realTestDir,
        testName,
        ...gitConfig,
      });
    } else if (backend === "hybrid") {
      // Create both MemFS and native backends
      realTestDir = await mkdtemp(join(tmpdir(), `gitvan-${testName}-`));
      hybridGit = await TestEnvironmentFactory.createHybridEnvironment({
        testDir: realTestDir,
        testName,
        ...gitConfig,
      });
      memfsTestDir = hybridGit.options.memfsDir;
    } else {
      // Auto mode - use hybrid environment
      realTestDir = await mkdtemp(join(tmpdir(), `gitvan-${testName}-`));
      hybridGit = await TestEnvironmentFactory.createHybridEnvironment({
        testDir: realTestDir,
        testName,
        ...gitConfig,
      });
      memfsTestDir = hybridGit.options.memfsDir;
    }

    // Create initial files
    if (initialFiles && Object.keys(initialFiles).length > 0) {
      if (hybridGit.getBackendType() === "memfs") {
        // Create files in MemFS
        Object.entries(initialFiles).forEach(([path, content]) => {
          hybridGit.writeFile(path, content);
        });
      } else {
        // Create files in real filesystem
        createFileStructure(realTestDir, initialFiles, "real");
      }
    }

    // Initialize Git repository if requested
    if (initGit) {
      await hybridGit.init(gitConfig);

      // Create initial commit if files exist
      const initialFileNames = Object.keys(initialFiles);
      if (initialFileNames.length > 0) {
        await hybridGit.add(initialFileNames);
        await hybridGit.commit("Initial commit");
      }
    }

    // Create test environment object
    const env = createHybridTestEnvironment(hybridGit, realTestDir, memfsTestDir, testName);

    // Run test function with environment
    await testFn(env);
  } finally {
    // Cleanup hybrid Git environment
    if (hybridGit) {
      await hybridGit.cleanup();
    }
    
    // Cleanup real directory if it exists
    if (realTestDir) {
      try {
        await rm(realTestDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Creates a hybrid test environment object with utilities
 * @param {Object} hybridGit - Hybrid Git environment instance
 * @param {string} realTestDir - Real test directory path (for Git operations)
 * @param {string} memfsTestDir - MemFS test directory path (for file operations)
 * @param {string} testName - Test name
 * @returns {Object} Test environment object
 */
function createHybridTestEnvironment(hybridGit, realTestDir, memfsTestDir, testName) {
  return {
    testDir: realTestDir, // Use real directory for Git operations
    memfsDir: memfsTestDir, // MemFS directory for file operations
    testName,
    gitDir: realTestDir,
    hybridGit, // Expose hybrid Git instance

    // Backend management
    useMemFS: () => hybridGit.useMemFS(),
    useNative: () => hybridGit.useNative(),
    getBackendType: () => hybridGit.getBackendType(),

    // File system utilities
    vol,

    // Unified file operations interface (works with both backends)
    files: {
      write: (path, content) => {
        if (hybridGit.getBackendType() === "memfs") {
          hybridGit.writeFile(path, content);
        } else {
          // Write to real filesystem
          const realPath = `${realTestDir}/${path}`;
          const dir = realPath.substring(0, realPath.lastIndexOf("/"));
          if (dir !== realTestDir) {
            require("fs").mkdirSync(dir, { recursive: true });
          }
          require("fs").writeFileSync(realPath, content);
        }
      },

      read: (path) => {
        if (hybridGit.getBackendType() === "memfs") {
          return hybridGit.readFile(path);
        } else {
          const realPath = `${realTestDir}/${path}`;
          return require("fs").readFileSync(realPath, "utf8");
        }
      },

      exists: (path) => {
        if (hybridGit.getBackendType() === "memfs") {
          return hybridGit.exists(path);
        } else {
          const realPath = `${realTestDir}/${path}`;
          return require("fs").existsSync(realPath);
        }
      },

      mkdir: (path) => {
        if (hybridGit.getBackendType() === "memfs") {
          // MemFS mkdir is handled by writeFile
          const memfsPath = `${memfsTestDir}/${path}`;
          vol.mkdirSync(memfsPath, { recursive: true });
        } else {
          const realPath = `${realTestDir}/${path}`;
          require("fs").mkdirSync(realPath, { recursive: true });
        }
      },

      syncToGit: async (path) => {
        if (hybridGit.getBackendType() === "memfs") {
          await hybridGit.syncToNative();
        }
        // For native backend, no sync needed
      },

      syncAllToGit: async () => {
        if (hybridGit.getBackendType() === "memfs") {
          await hybridGit.syncToNative();
        }
        // For native backend, no sync needed
      },
    },

    // GitVan context wrapper (uses real directory for Git operations)
    withGitVan: (fn) => withGitVan({ cwd: realTestDir }, fn),

    // Git composable wrapper (uses real directory)
    withGit: async (fn) => {
      return await withGitVan({ cwd: realTestDir }, async () => {
        const git = useGit();
        return await fn(git);
      });
    },

    // FileSystem composable wrapper (uses real directory)
    withFileSystem: async (fn) => {
      return await withGitVan({ cwd: realTestDir }, async () => {
        const fs = useFileSystem();
        return await fn(fs);
      });
    },

    // Template composable wrapper (uses real directory)
    withTemplate: async (fn) => {
      return await withGitVan({ cwd: realTestDir }, async () => {
        const template = await useTemplate({
          paths: [`${realTestDir}/templates`],
        });
        return await fn(template);
      });
    },

    // File operations (work with both real and MemFS)
    createFile: (path, content) => {
      const realPath = `${realTestDir}/${path}`;
      const memfsPath = `${memfsTestDir}/${path}`;

      // Create in real file system
      const dir = realPath.substring(0, realPath.lastIndexOf("/"));
      if (dir !== realTestDir) {
        require("fs").mkdirSync(dir, { recursive: true });
      }
      require("fs").writeFileSync(realPath, content);

      // Create in MemFS
      const memfsDir = memfsPath.substring(0, memfsPath.lastIndexOf("/"));
      if (memfsDir !== memfsTestDir) {
        vol.mkdirSync(memfsDir, { recursive: true });
      }
      vol.writeFileSync(memfsPath, content);

      return realPath;
    },

    createDir: (path) => {
      const realPath = `${realTestDir}/${path}`;
      const memfsPath = `${memfsTestDir}/${path}`;

      require("fs").mkdirSync(realPath, { recursive: true });
      vol.mkdirSync(memfsPath, { recursive: true });

      return realPath;
    },

    readFile: (path) => {
      const realPath = `${realTestDir}/${path}`;
      return require("fs").readFileSync(realPath, "utf8");
    },

    exists: (path) => {
      const realPath = `${realTestDir}/${path}`;
      return require("fs").existsSync(realPath);
    },

    // Git operations (use hybrid Git instance)
    gitInit: async (config) => await hybridGit.init(config),

    gitAdd: async (files) => await hybridGit.add(files),

    gitCommit: async (message, author) => await hybridGit.commit(message, author),

    gitStatus: async () => await hybridGit.status(),

    gitLog: async (options) => await hybridGit.log(options),

    gitCurrentBranch: async () => await hybridGit.currentBranch(),

    gitListBranches: async () => await hybridGit.listBranches(),

    gitCheckout: async (branch) => await hybridGit.checkout(branch),

    gitCheckoutBranch: async (branch) => await hybridGit.checkoutBranch(branch),

    gitMerge: async (branch, options) => await hybridGit.merge(branch, options),

    // Utility methods
    getAbsolutePath: (relativePath) => `${realTestDir}/${relativePath}`,
    getMemFSPath: (relativePath) => `${memfsTestDir}/${relativePath}`,

    // Safety validation
    assertRealFileSystemSafe: (realPath) => {
      if (require("fs").existsSync(realPath)) {
        throw new Error(
          `Real file system path ${realPath} exists - this should not happen in tests!`
        );
      }
    },
  };
}

/**
 * Creates file structure in both real and MemFS
 * @param {string} basePath - Base path for files
 * @param {Object} structure - File structure to create
 * @param {string} fsType - File system type ('real' or 'memfs')
 */
function createFileStructure(basePath, structure, fsType = "real") {
  Object.entries(structure).forEach(([path, content]) => {
    const fullPath = `${basePath}/${path}`;

    if (typeof content === "string") {
      // It's a file
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      if (dir !== basePath) {
        // Create directory
        if (fsType === "real") {
          require("fs").mkdirSync(dir, { recursive: true });
        } else {
          vol.mkdirSync(dir, { recursive: true });
        }
      }
      // Write file
      if (fsType === "real") {
        require("fs").writeFileSync(fullPath, content);
      } else {
        vol.writeFileSync(fullPath, content);
      }
    } else if (typeof content === "object" && content !== null) {
      // It's a directory
      if (fsType === "real") {
        require("fs").mkdirSync(fullPath, { recursive: true });
      } else {
        vol.mkdirSync(fullPath, { recursive: true });
      }
      createFileStructure(fullPath, content, fsType);
    }
  });
}

/**
 * Initializes Git repository in test directory
 * @param {string} testDir - Test directory path
 * @param {Object} gitConfig - Git configuration options
 */
async function initializeGitRepository(testDir, gitConfig = {}) {
  const {
    userName = "Test User",
    userEmail = "test@gitvan.dev",
    defaultBranch = "main",
    ...envVars
  } = gitConfig;

  // Configure git environment
  const gitEnv = {
    TZ: "UTC",
    LANG: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_AUTHOR_NAME: userName,
    GIT_AUTHOR_EMAIL: userEmail,
    GIT_COMMITTER_NAME: userName,
    GIT_COMMITTER_EMAIL: userEmail,
    GIT_AUTHOR_DATE: "2024-01-01T00:00:00Z",
    GIT_COMMITTER_DATE: "2024-01-01T00:00:00Z",
    ...envVars,
  };

  // Initialize git repository
  execSync("git init", { cwd: testDir, env: { ...process.env, ...gitEnv } });
  execSync(`git config user.name "${userName}"`, { cwd: testDir });
  execSync(`git config user.email "${userEmail}"`, { cwd: testDir });
  execSync(`git config init.defaultBranch ${defaultBranch}`, { cwd: testDir });
  execSync("git config advice.defaultBranchName false", { cwd: testDir });

  // Ensure we're on the default branch
  try {
    execSync(`git checkout -b ${defaultBranch}`, { cwd: testDir });
  } catch {
    // Branch might already exist
  }
}

/**
 * Creates a simple test environment for basic testing
 * @param {Object} options - Configuration options
 * @param {Function} testFn - Test function to run
 */
export async function withSimpleTestEnvironment(options = {}, testFn) {
  return await withTestEnvironment(
    {
      testName: "simple",
      initGit: false,
      ...options,
    },
    testFn
  );
}

/**
 * Creates a Git-enabled test environment
 * @param {Object} options - Configuration options
 * @param {Function} testFn - Test function to run
 */
export async function withGitTestEnvironment(options = {}, testFn) {
  return await withTestEnvironment(
    {
      testName: "git-enabled",
      initGit: true,
      ...options,
    },
    testFn
  );
}

/**
 * Creates a template-enabled test environment
 * @param {Object} options - Configuration options
 * @param {Function} testFn - Test function to run
 */
export async function withTemplateTestEnvironment(options = {}, testFn) {
  return await withTestEnvironment(
    {
      testName: "template-enabled",
      initGit: true,
      initialFiles: {
        templates: {
          "default.njk": "Hello {{ name }}!",
          "component.njk":
            "export default function {{ name | capitalize }}() {}",
        },
      },
      ...options,
    },
    testFn
  );
}

/**
 * Creates a MemFS-only test environment (ultra-fast)
 * @param {Object} options - Configuration options
 * @param {Function} testFn - Test function to run
 */
export async function withMemFSTestEnvironment(options = {}, testFn) {
  return await withTestEnvironment(
    {
      testName: "memfs-only",
      backend: "memfs",
      initGit: true,
      ...options,
    },
    testFn
  );
}

/**
 * Creates a native Git test environment (full compatibility)
 * @param {Object} options - Configuration options
 * @param {Function} testFn - Test function to run
 */
export async function withNativeGitTestEnvironment(options = {}, testFn) {
  return await withTestEnvironment(
    {
      testName: "native-git",
      backend: "native",
      initGit: true,
      ...options,
    },
    testFn
  );
}

/**
 * Creates a hybrid test environment (best of both worlds)
 * @param {Object} options - Configuration options
 * @param {Function} testFn - Test function to run
 */
export async function withHybridTestEnvironment(options = {}, testFn) {
  return await withTestEnvironment(
    {
      testName: "hybrid",
      backend: "hybrid",
      initGit: true,
      ...options,
    },
    testFn
  );
}
