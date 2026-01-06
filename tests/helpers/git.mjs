/**
 * Git Test Helpers
 * Utilities for testing Git operations
 */

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "pathe";

/**
 * Initialize a test Git repository
 * @param {string} dir - Directory path
 * @param {Object} options - Configuration options
 */
export async function initTestRepo(dir, options = {}) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Initialize git repo
  execSync("git init", { cwd: dir, stdio: "ignore" });

  // Configure git
  execSync('git config user.name "Test User"', { cwd: dir, stdio: "ignore" });
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: "ignore" });

  // Set default branch
  const branch = options.defaultBranch || "main";
  execSync(`git checkout -b ${branch}`, { cwd: dir, stdio: "ignore" });

  // Create initial commit if requested
  if (options.initialCommit !== false) {
    const readmePath = join(dir, "README.md");
    writeFileSync(readmePath, "# Test Repository\n");
    execSync("git add .", { cwd: dir, stdio: "ignore" });
    execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "ignore" });
  }

  return dir;
}

/**
 * Create a commit in the test repository
 * @param {string} dir - Repository directory
 * @param {string} message - Commit message
 * @param {Object} files - Files to add (filename: content)
 */
export function createCommit(dir, message, files = {}) {
  // Write files
  for (const [filename, content] of Object.entries(files)) {
    const filePath = join(dir, filename);
    const fileDir = join(filePath, "..");

    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true });
    }

    writeFileSync(filePath, content);
  }

  // Stage and commit
  execSync("git add .", { cwd: dir, stdio: "ignore" });
  execSync(`git commit -m "${message}"`, { cwd: dir, stdio: "ignore" });

  // Return commit hash
  return execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf-8" }).trim();
}

/**
 * Create a branch in the test repository
 * @param {string} dir - Repository directory
 * @param {string} name - Branch name
 * @param {boolean} checkout - Whether to checkout the branch
 */
export function createBranch(dir, name, checkout = true) {
  const cmd = checkout ? `git checkout -b ${name}` : `git branch ${name}`;
  execSync(cmd, { cwd: dir, stdio: "ignore" });
}

/**
 * Merge a branch
 * @param {string} dir - Repository directory
 * @param {string} branch - Branch to merge
 * @param {Object} options - Merge options
 */
export function mergeBranch(dir, branch, options = {}) {
  const strategy = options.strategy || "merge";
  let cmd = `git merge ${branch}`;

  if (strategy === "squash") {
    cmd += " --squash";
  } else if (strategy === "rebase") {
    cmd = `git rebase ${branch}`;
  }

  try {
    execSync(cmd, { cwd: dir, stdio: "ignore" });
    return { success: true, conflicts: false };
  } catch (error) {
    // Check if merge conflict
    const status = execSync("git status", { cwd: dir, encoding: "utf-8" });
    if (status.includes("Unmerged paths")) {
      return { success: false, conflicts: true };
    }
    throw error;
  }
}

/**
 * Create a conflicting merge scenario
 * @param {string} dir - Repository directory
 */
export function createConflict(dir) {
  // Create and checkout feature branch
  createBranch(dir, "feature", true);
  createCommit(dir, "Feature change", { "conflict.txt": "Feature version\n" });

  // Go back to main and create conflicting change
  execSync("git checkout main", { cwd: dir, stdio: "ignore" });
  createCommit(dir, "Main change", { "conflict.txt": "Main version\n" });

  // Try to merge (will conflict)
  return mergeBranch(dir, "feature");
}

/**
 * Get current branch
 * @param {string} dir - Repository directory
 */
export function getCurrentBranch(dir) {
  return execSync("git branch --show-current", { cwd: dir, encoding: "utf-8" }).trim();
}

/**
 * Get commit count
 * @param {string} dir - Repository directory
 */
export function getCommitCount(dir) {
  const output = execSync("git rev-list --count HEAD", { cwd: dir, encoding: "utf-8" });
  return parseInt(output.trim(), 10);
}

/**
 * Get file status
 * @param {string} dir - Repository directory
 */
export function getStatus(dir) {
  const output = execSync("git status --porcelain", { cwd: dir, encoding: "utf-8" });
  return output.split("\n").filter(Boolean).map(line => {
    const status = line.slice(0, 2);
    const file = line.slice(3);
    return { status, file };
  });
}

/**
 * Check if repository is clean
 * @param {string} dir - Repository directory
 */
export function isClean(dir) {
  return getStatus(dir).length === 0;
}

/**
 * Create a tag
 * @param {string} dir - Repository directory
 * @param {string} name - Tag name
 * @param {string} message - Tag message
 */
export function createTag(dir, name, message = "") {
  const cmd = message ? `git tag -a ${name} -m "${message}"` : `git tag ${name}`;
  execSync(cmd, { cwd: dir, stdio: "ignore" });
}

/**
 * Get remote URL
 * @param {string} dir - Repository directory
 * @param {string} remote - Remote name
 */
export function getRemoteUrl(dir, remote = "origin") {
  try {
    return execSync(`git remote get-url ${remote}`, { cwd: dir, encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}
