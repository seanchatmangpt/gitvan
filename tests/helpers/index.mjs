/**
 * Test Helpers Index
 * Central export for all test utilities
 */

// Context helpers
export {
  createTestContext,
  withTestEnvironment,
  createMockGitVanContext,
  withTimeout,
  assertContextAvailable,
  createDeterministicData,
} from "./context.mjs";

// Git helpers
export {
  initTestRepo,
  createCommit,
  createBranch,
  mergeBranch,
  createConflict,
  getCurrentBranch,
  getCommitCount,
  getStatus,
  isClean,
  createTag,
  getRemoteUrl,
} from "./git.mjs";

// Filesystem helpers
export {
  createFileStructure,
  readFileStructure,
  assertFileExists,
  assertFileNotExists,
  assertFileContent,
  createTempDir,
  cleanupDir,
  copyDir,
  getFileSize,
  getDirectorySize,
} from "./filesystem.mjs";

// Mock helpers
export {
  createMockGit,
  createMockTemplate,
  createMockJob,
  createMockEvent,
  createMockFileSystem,
  createMockWorkflowEngine,
  createMockAIProvider,
  spyConsole,
  createMockClock,
  waitFor,
  createDeferred,
} from "./mock.mjs";
