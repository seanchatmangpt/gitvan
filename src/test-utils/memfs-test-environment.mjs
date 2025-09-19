/**
 * @fileoverview GitVan v2 — In-Memory Test Environment
 *
 * Provides an in-memory file system for testing using memfs,
 * integrated with GitVan composables for safe, isolated testing.
 */

import { vol } from "memfs";
import { withGitVan } from "../core/context.mjs";
import { useFileSystem } from "../composables/filesystem.mjs";
import { useGit } from "../composables/git.mjs";

/**
 * Create an in-memory test environment
 * @param {Object} options - Configuration options
 * @param {Object} [options.files={}] - Initial file structure
 * @param {string} [options.cwd='/test'] - Working directory
 * @param {Object} [options.gitConfig] - Git configuration
 * @returns {Object} Test environment with composables
 */
export function createTestEnvironment(options = {}) {
  const {
    files = {},
    cwd = "/test",
    gitConfig = {
      "user.name": "Test User",
      "user.email": "test@example.com",
      "init.defaultBranch": "main",
    },
  } = options;

  // Set up in-memory file system
  vol.fromJSON(files, cwd);

  // Create context for GitVan composables
  const context = {
    cwd,
    env: {
      ...process.env,
      TZ: "UTC",
      LANG: "C",
    },
  };

  return {
    // File system operations (using memfs)
    fs: {
      // Basic file operations
      async writeFile(filePath, content) {
        const fullPath = filePath.startsWith("/")
          ? filePath
          : `${cwd}/${filePath}`;
        vol.writeFileSync(fullPath, content);
        return fullPath;
      },

      async readFile(filePath) {
        const fullPath = filePath.startsWith("/")
          ? filePath
          : `${cwd}/${filePath}`;
        return vol.readFileSync(fullPath, "utf8");
      },

      async exists(filePath) {
        const fullPath = filePath.startsWith("/")
          ? filePath
          : `${cwd}/${filePath}`;
        return vol.existsSync(fullPath);
      },

      async mkdir(dirPath) {
        const fullPath = dirPath.startsWith("/")
          ? dirPath
          : `${cwd}/${dirPath}`;
        vol.mkdirSync(fullPath, { recursive: true });
        return fullPath;
      },

      async rm(targetPath) {
        const fullPath = targetPath.startsWith("/")
          ? targetPath
          : `${cwd}/${targetPath}`;
        vol.rmSync(fullPath, { recursive: true, force: true });
      },

      // Directory operations
      async readdir(dirPath) {
        const fullPath = dirPath.startsWith("/")
          ? dirPath
          : `${cwd}/${dirPath}`;
        return vol.readdirSync(fullPath);
      },

      // Path operations
      resolve(filePath) {
        return filePath.startsWith("/") ? filePath : `${cwd}/${filePath}`;
      },

      // Get current file system state
      getSnapshot() {
        return vol.toJSON();
      },

      // Reset file system
      reset(newFiles = {}) {
        vol.reset();
        vol.fromJSON(newFiles, cwd);
      },
    },

    // Git operations (using GitVan composables)
    async git() {
      return withGitVan(context, async () => {
        const git = useGit();

        // Initialize git repository if not already initialized
        try {
          await git.runVoid(["init"]);
          await git.runVoid(["config", "user.name", gitConfig["user.name"]]);
          await git.runVoid(["config", "user.email", gitConfig["user.email"]]);
          await git.runVoid([
            "config",
            "init.defaultBranch",
            gitConfig["init.defaultBranch"],
          ]);
        } catch (error) {
          // Repository might already be initialized
          if (!error.message.includes("already exists")) {
            throw error;
          }
        }

        return git;
      });
    },

    // File system operations (using GitVan composables)
    async filesystem() {
      return withGitVan(context, async () => {
        return useFileSystem();
      });
    },

    // Context for direct composable access
    async withContext(fn) {
      return withGitVan(context, fn);
    },

    // Utility methods
    cwd,
    context,

    // Cleanup
    cleanup() {
      vol.reset();
    },
  };
}

/**
 * Create a test environment with Git repository
 * @param {Object} options - Configuration options
 * @returns {Object} Test environment with initialized Git repo
 */
export async function createGitTestEnvironment(options = {}) {
  const env = createTestEnvironment(options);

  // Initialize Git repository
  const git = await env.git();

  return {
    ...env,
    git: () => git, // Return the already initialized git instance
  };
}

/**
 * Create a test environment with common project structure
 * @param {Object} options - Configuration options
 * @returns {Object} Test environment with project files
 */
export function createProjectTestEnvironment(options = {}) {
  const defaultFiles = {
    "package.json": JSON.stringify(
      {
        name: "test-project",
        version: "1.0.0",
        dependencies: {},
      },
      null,
      2
    ),
    "README.md": "# Test Project\n\nThis is a test project.",
    ".gitignore": "node_modules/\n*.log\n",
    "src/index.js": 'console.log("Hello, World!");',
  };

  return createTestEnvironment({
    files: { ...defaultFiles, ...options.files },
    ...options,
  });
}

/**
 * Test helper for running tests with in-memory file system
 * @param {Function} testFn - Test function to run
 * @param {Object} options - Test environment options
 */
export async function withTestEnvironment(testFn, options = {}) {
  const env = createTestEnvironment(options);

  try {
    await testFn(env);
  } finally {
    env.cleanup();
  }
}

/**
 * Test helper for running Git tests with in-memory file system
 * @param {Function} testFn - Test function to run
 * @param {Object} options - Test environment options
 */
export async function withGitTestEnvironment(testFn, options = {}) {
  const env = await createGitTestEnvironment(options);

  try {
    await testFn(env);
  } finally {
    env.cleanup();
  }
}
