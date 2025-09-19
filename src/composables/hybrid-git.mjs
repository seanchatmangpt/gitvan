/**
 * @fileoverview GitVan Hybrid Git Architecture
 *
 * Combines MemFS + isomorphic-git (testing) with native Git (production)
 * for optimal performance, safety, and compatibility
 */

import { vol } from "memfs";
import git from "isomorphic-git";
import { execSync } from "child_process";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Git Backend Interface
 * Provides a unified API for both MemFS and native Git operations
 */
class GitBackend {
  constructor(type = "auto", options = {}) {
    this.type = type;
    this.options = options;
    this.fs = options.fs || vol;
    this.dir = options.dir;
  }

  /**
   * Auto-detect the best backend based on environment
   */
  static auto(options = {}) {
    // In test environment, prefer MemFS
    if (process.env.NODE_ENV === "test" || options.forceMemFS) {
      return new GitBackend("memfs", options);
    }

    // In production, prefer native Git
    return new GitBackend("native", options);
  }

  /**
   * Initialize Git repository
   */
  async init(config = {}) {
    const defaultConfig = {
      userName: "GitVan User",
      userEmail: "gitvan@example.com",
      defaultBranch: "main",
      ...config,
    };

    if (this.type === "memfs") {
      await git.init({ fs: this.fs, dir: this.dir });
      await git.setConfig({
        fs: this.fs,
        dir: this.dir,
        path: "user.name",
        value: defaultConfig.userName,
      });
      await git.setConfig({
        fs: this.fs,
        dir: this.dir,
        path: "user.email",
        value: defaultConfig.userEmail,
      });
      await git.setConfig({
        fs: this.fs,
        dir: this.dir,
        path: "init.defaultBranch",
        value: defaultConfig.defaultBranch,
      });
    } else {
      execSync("git init", { cwd: this.dir });
      execSync(`git config user.name "${defaultConfig.userName}"`, {
        cwd: this.dir,
      });
      execSync(`git config user.email "${defaultConfig.userEmail}"`, {
        cwd: this.dir,
      });
      execSync(`git config init.defaultBranch ${defaultConfig.defaultBranch}`, {
        cwd: this.dir,
      });
    }
  }

  /**
   * Add files to staging
   */
  async add(files) {
    if (this.type === "memfs") {
      if (Array.isArray(files)) {
        for (const file of files) {
          await git.add({ fs: this.fs, dir: this.dir, filepath: file });
        }
      } else {
        await git.add({ fs: this.fs, dir: this.dir, filepath: files });
      }
    } else {
      const fileList = Array.isArray(files) ? files.join(" ") : files;
      execSync(`git add ${fileList}`, { cwd: this.dir });
    }
  }

  /**
   * Commit changes
   */
  async commit(message, author = {}) {
    const defaultAuthor = {
      name: "GitVan User",
      email: "gitvan@example.com",
      ...author,
    };

    if (this.type === "memfs") {
      await git.commit({
        fs: this.fs,
        dir: this.dir,
        message,
        author: defaultAuthor,
      });
    } else {
      execSync(`git commit -m "${message}"`, { cwd: this.dir });
    }
  }

  /**
   * Get commit log
   */
  async log(options = {}) {
    if (this.type === "memfs") {
      const log = await git.log({ fs: this.fs, dir: this.dir });
      return log.map((entry) => ({
        hash: entry.oid,
        message: entry.commit.message.trim(),
        author: entry.commit.author,
        date: entry.commit.committer.timestamp,
      }));
    } else {
      const format = options.format || "%h %s %an %ad";
      const output = execSync(`git log --pretty=format:"${format}"`, {
        cwd: this.dir,
        encoding: "utf8",
      });
      return output
        .trim()
        .split("\n")
        .map((line) => {
          const [hash, ...rest] = line.split(" ");
          return {
            hash,
            message: rest.join(" "),
            author: "Unknown", // Would need more parsing
            date: new Date(),
          };
        });
    }
  }

  /**
   * Get repository status
   */
  async status() {
    if (this.type === "memfs") {
      return await git.status({ fs: this.fs, dir: this.dir, filepath: "." });
    } else {
      const output = execSync("git status --porcelain", {
        cwd: this.dir,
        encoding: "utf8",
      });
      return output.trim();
    }
  }

  /**
   * Create and switch to branch
   */
  async checkoutBranch(branchName) {
    if (this.type === "memfs") {
      await git.branch({ fs: this.fs, dir: this.dir, ref: branchName });
      await git.checkout({ fs: this.fs, dir: this.dir, ref: branchName });
    } else {
      execSync(`git checkout -b ${branchName}`, { cwd: this.dir });
    }
  }

  /**
   * Switch to existing branch
   */
  async checkout(branchName) {
    if (this.type === "memfs") {
      await git.checkout({ fs: this.fs, dir: this.dir, ref: branchName });
    } else {
      execSync(`git checkout ${branchName}`, { cwd: this.dir });
    }
  }

  /**
   * Merge branches
   */
  async merge(sourceBranch, options = {}) {
    if (this.type === "memfs") {
      await git.merge({
        fs: this.fs,
        dir: this.dir,
        ours: await git.currentBranch({ fs: this.fs, dir: this.dir }),
        theirs: sourceBranch,
        author: options.author || {
          name: "GitVan User",
          email: "gitvan@example.com",
        },
      });
    } else {
      execSync(`git merge ${sourceBranch}`, { cwd: this.dir });
    }
  }

  /**
   * Get current branch
   */
  async currentBranch() {
    if (this.type === "memfs") {
      return await git.currentBranch({ fs: this.fs, dir: this.dir });
    } else {
      const output = execSync("git branch --show-current", {
        cwd: this.dir,
        encoding: "utf8",
      });
      return output.trim();
    }
  }

  /**
   * List branches
   */
  async listBranches() {
    if (this.type === "memfs") {
      return await git.listBranches({ fs: this.fs, dir: this.dir });
    } else {
      const output = execSync("git branch", {
        cwd: this.dir,
        encoding: "utf8",
      });
      return output
        .trim()
        .split("\n")
        .map((branch) => branch.replace("*", "").trim());
    }
  }
}

/**
 * Hybrid Git Environment
 * Provides seamless switching between MemFS and native Git
 */
class HybridGitEnvironment {
  constructor(options = {}) {
    this.options = {
      testDir: null,
      memfsDir: null,
      backend: "auto",
      ...options,
    };

    this.memfsBackend = null;
    this.nativeBackend = null;
    this.currentBackend = null;
  }

  /**
   * Initialize the hybrid environment
   */
  async initialize() {
    if (this.options.backend === "memfs" || this.options.backend === "auto") {
      // Setup MemFS environment
      this.options.memfsDir =
        this.options.memfsDir || `/test-memfs-${Date.now()}`;
      vol.mkdirSync(this.options.memfsDir, { recursive: true });

      this.memfsBackend = new GitBackend("memfs", {
        fs: vol,
        dir: this.options.memfsDir,
      });
    }

    if (this.options.backend === "native" || this.options.backend === "auto") {
      // Setup native Git environment
      this.options.testDir =
        this.options.testDir ||
        (await mkdtemp(join(tmpdir(), "gitvan-native-")));

      this.nativeBackend = new GitBackend("native", {
        dir: this.options.testDir,
      });
    }

    // Auto-select backend
    this.currentBackend = this.selectBackend();
  }

  /**
   * Select the appropriate backend
   */
  selectBackend() {
    if (this.options.backend === "memfs") {
      return this.memfsBackend;
    } else if (this.options.backend === "native") {
      return this.nativeBackend;
    } else {
      // Auto-select based on environment
      if (process.env.NODE_ENV === "test") {
        return this.memfsBackend;
      } else {
        return this.nativeBackend;
      }
    }
  }

  /**
   * Switch to MemFS backend
   */
  useMemFS() {
    if (!this.memfsBackend) {
      throw new Error("MemFS backend not initialized");
    }
    this.currentBackend = this.memfsBackend;
    return this;
  }

  /**
   * Switch to native Git backend
   */
  useNative() {
    if (!this.nativeBackend) {
      throw new Error("Native Git backend not initialized");
    }
    this.currentBackend = this.nativeBackend;
    return this;
  }

  /**
   * Get current backend type
   */
  getBackendType() {
    return this.currentBackend?.type || "none";
  }

  /**
   * Delegate all Git operations to current backend
   */
  async init(config) {
    return await this.currentBackend.init(config);
  }

  async add(files) {
    return await this.currentBackend.add(files);
  }

  async commit(message, author) {
    return await this.currentBackend.commit(message, author);
  }

  async log(options) {
    return await this.currentBackend.log(options);
  }

  async status() {
    return await this.currentBackend.status();
  }

  async checkoutBranch(branchName) {
    return await this.currentBackend.checkoutBranch(branchName);
  }

  async checkout(branchName) {
    return await this.currentBackend.checkout(branchName);
  }

  async merge(sourceBranch, options) {
    return await this.currentBackend.merge(sourceBranch, options);
  }

  async currentBranch() {
    return await this.currentBackend.currentBranch();
  }

  async listBranches() {
    return await this.currentBackend.listBranches();
  }

  /**
   * File operations (MemFS only)
   */
  writeFile(path, content) {
    if (this.getBackendType() !== "memfs") {
      throw new Error("File operations only available with MemFS backend");
    }
    const fullPath = `${this.options.memfsDir}/${path}`;
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    if (dir !== this.options.memfsDir) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(fullPath, content);
  }

  readFile(path) {
    if (this.getBackendType() !== "memfs") {
      throw new Error("File operations only available with MemFS backend");
    }
    const fullPath = `${this.options.memfsDir}/${path}`;
    return vol.readFileSync(fullPath, "utf8");
  }

  exists(path) {
    if (this.getBackendType() !== "memfs") {
      throw new Error("File operations only available with MemFS backend");
    }
    const fullPath = `${this.options.memfsDir}/${path}`;
    return vol.existsSync(fullPath);
  }

  /**
   * Sync MemFS to native Git (for hybrid workflows)
   */
  async syncToNative() {
    if (!this.memfsBackend || !this.nativeBackend) {
      throw new Error("Both MemFS and native backends required for sync");
    }

    // Copy files from MemFS to native directory
    const syncDir = (memfsDir, nativeDir) => {
      try {
        const entries = vol.readdirSync(memfsDir);
        for (const entry of entries) {
          const memfsEntryPath = `${memfsDir}/${entry}`;
          const nativeEntryPath = `${nativeDir}/${entry}`;

          if (vol.statSync(memfsEntryPath).isDirectory()) {
            require("fs").mkdirSync(nativeEntryPath, { recursive: true });
            syncDir(memfsEntryPath, nativeEntryPath);
          } else {
            const content = vol.readFileSync(memfsEntryPath, "utf8");
            require("fs").writeFileSync(nativeEntryPath, content);
          }
        }
      } catch (error) {
        // Ignore errors for non-existent directories
      }
    };

    syncDir(this.options.memfsDir, this.options.testDir);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.options.testDir) {
      try {
        await rm(this.options.testDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    vol.reset();
  }
}

/**
 * GitVan Composable Integration
 * Integrates hybrid Git environment with GitVan's composable system
 */
export async function useHybridGit(options = {}) {
  const env = new HybridGitEnvironment(options);
  await env.initialize();

  return {
    // Backend management
    useMemFS: () => env.useMemFS(),
    useNative: () => env.useNative(),
    getBackendType: () => env.getBackendType(),

    // Git operations
    init: (config) => env.init(config),
    add: (files) => env.add(files),
    commit: (message, author) => env.commit(message, author),
    log: (options) => env.log(options),
    status: () => env.status(),
    checkoutBranch: (branchName) => env.checkoutBranch(branchName),
    checkout: (branchName) => env.checkout(branchName),
    merge: (sourceBranch, options) => env.merge(sourceBranch, options),
    currentBranch: () => env.currentBranch(),
    listBranches: () => env.listBranches(),

    // File operations (MemFS only)
    writeFile: (path, content) => env.writeFile(path, content),
    readFile: (path) => env.readFile(path),
    exists: (path) => env.exists(path),

    // Hybrid operations
    syncToNative: () => env.syncToNative(),

    // Options access
    options: env.options,

    // Cleanup
    cleanup: () => env.cleanup(),
  };
}

/**
 * Test Environment Factory
 * Creates optimized test environments based on requirements
 */
export class TestEnvironmentFactory {
  /**
   * Create fast MemFS-only environment for unit tests
   */
  static async createMemFSEnvironment(options = {}) {
    return await useHybridGit({
      backend: "memfs",
      ...options,
    });
  }

  /**
   * Create native Git environment for integration tests
   */
  static async createNativeEnvironment(options = {}) {
    return await useHybridGit({
      backend: "native",
      ...options,
    });
  }

  /**
   * Create hybrid environment for complex workflows
   */
  static async createHybridEnvironment(options = {}) {
    return await useHybridGit({
      backend: "auto",
      ...options,
    });
  }
}

export default {
  GitBackend,
  HybridGitEnvironment,
  useHybridGit,
  TestEnvironmentFactory,
};
