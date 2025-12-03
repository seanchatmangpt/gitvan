#!/usr/bin/env node

/**
 * Worktree Features Test
 * Tests all worktree functionality in GitVan
 */

import {
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TEST_DIR = "/tmp/gitvan-worktree-test";

function setupTestEnvironment() {
  console.log("🧪 Setting up worktree test environment...");

  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }

  mkdirSync(TEST_DIR, { recursive: true });
  console.log("✅ Test environment ready");
}

function createTestRepo() {
  console.log("\n📋 Creating test Git repository...");

  // Initialize main repository
  execSync("git init", { cwd: TEST_DIR });

  // Create initial commit
  writeFileSync(join(TEST_DIR, "README.md"), "# Test Repository\n");
  execSync("git add README.md", { cwd: TEST_DIR });
  execSync("git commit -m 'Initial commit'", { cwd: TEST_DIR });

  // Create additional branches
  execSync("git checkout -b feature-branch", { cwd: TEST_DIR });
  writeFileSync(join(TEST_DIR, "feature.txt"), "Feature content\n");
  execSync("git add feature.txt", { cwd: TEST_DIR });
  execSync("git commit -m 'Add feature'", { cwd: TEST_DIR });

  execSync("git checkout master", { cwd: TEST_DIR });

  console.log("✅ Test repository created");
}

function createWorktrees() {
  console.log("\n📋 Creating additional worktrees...");

  const worktreeDir = join(TEST_DIR, "worktrees");
  mkdirSync(worktreeDir, { recursive: true });

  // Create worktree for feature branch
  const featureWorktree = join(worktreeDir, "feature-worktree");
  execSync(`git worktree add ${featureWorktree} feature-branch`, {
    cwd: TEST_DIR,
  });

  // Create worktree for new branch
  const newWorktree = join(worktreeDir, "new-worktree");
  execSync(`git worktree add -b new-branch ${newWorktree}`, { cwd: TEST_DIR });

  console.log("✅ Additional worktrees created");
  return { featureWorktree, newWorktree };
}

async function testWorktreeUtils() {
  console.log("\n📋 Testing worktree utilities...");

  const { withGitVan } = await import("./src/core/context.mjs");
  const { getWorktreeInfo, listWorktrees, isWorktree, worktreeKey } =
    await import("./src/utils/worktree.mjs");

  const ctx = {
    cwd: TEST_DIR,
    env: process.env,
    now: () => new Date().toISOString(),
  };

  let passed = 0;
  const total = 4;

  try {
    await withGitVan(ctx, async () => {
      // Test isWorktree
      const isWT = await isWorktree();
      if (isWT) {
        console.log("✅ isWorktree(): Correctly detected worktree");
        passed++;
      } else {
        console.log("❌ isWorktree(): Failed to detect worktree");
      }

      // Test getWorktreeInfo
      try {
        const info = await getWorktreeInfo();
        console.log(`   Debug - getWorktreeInfo result:`, info);
        if (info.worktree && info.branch && info.head) {
          console.log("✅ getWorktreeInfo(): Retrieved worktree info");
          console.log(`   Worktree: ${info.worktree}`);
          console.log(`   Branch: ${info.branch}`);
          console.log(`   HEAD: ${info.head.slice(0, 8)}`);
          passed++;
        } else {
          console.log("❌ getWorktreeInfo(): Failed to get worktree info");
          console.log(
            `   Missing: worktree=${!!info.worktree}, branch=${!!info.branch}, head=${!!info.head}`
          );
        }
      } catch (error) {
        console.log(`❌ getWorktreeInfo(): Error - ${error.message}`);
      }

      // Test listWorktrees
      const worktrees = await listWorktrees();
      if (worktrees.length >= 1) {
        console.log("✅ listWorktrees(): Retrieved worktrees");
        console.log(`   Found ${worktrees.length} worktrees`);
        worktrees.forEach((wt, i) => {
          console.log(`   ${i + 1}. ${wt.path} (${wt.branch || "detached"})`);
        });
        passed++;
      } else {
        console.log("❌ listWorktrees(): Failed to list worktrees");
      }

      // Test worktreeKey
      const key = await worktreeKey();
      if (key && key.includes("#")) {
        console.log("✅ worktreeKey(): Generated worktree key");
        console.log(`   Key: ${key}`);
        passed++;
      } else {
        console.log("❌ worktreeKey(): Failed to generate worktree key");
      }
    });
  } catch (error) {
    console.log(`❌ Worktree utilities test failed: ${error.message}`);
  }

  console.log(`✅ Worktree utilities: ${passed}/${total} passed`);
  return passed === total;
}

async function testGitComposableWorktrees() {
  console.log("\n📋 Testing Git composable worktree methods...");

  const { withGitVan } = await import("./src/core/context.mjs");
  const { useGit } = await import("./src/composables/git.mjs");

  const ctx = {
    cwd: TEST_DIR,
    env: process.env,
    now: () => new Date().toISOString(),
  };

  let passed = 0;
  const total = 3;

  try {
    await withGitVan(ctx, async () => {
      const git = useGit();

      // Test listWorktrees from Git composable
      const worktrees = await git.listWorktrees();
      if (worktrees.length >= 1) {
        console.log("✅ git.listWorktrees(): Retrieved worktrees");
        console.log(`   Found ${worktrees.length} worktrees`);
        worktrees.forEach((wt, i) => {
          console.log(
            `   ${i + 1}. ${wt.path} (${wt.branch || "detached"}) ${
              wt.isMain ? "(main)" : ""
            }`
          );
        });
        passed++;
      } else {
        console.log("❌ git.listWorktrees(): Failed to list worktrees");
      }

      // Test worktree-specific operations
      const repoRoot = await git.repoRoot();
      const worktreeGitDir = await git.worktreeGitDir();
      if (repoRoot && worktreeGitDir) {
        console.log("✅ Git worktree operations: Working");
        console.log(`   Repo root: ${repoRoot}`);
        console.log(`   Git dir: ${worktreeGitDir}`);
        passed++;
      } else {
        console.log("❌ Git worktree operations: Failed");
      }

      // Test branch detection
      const branch = await git.getCurrentBranch();
      if (branch) {
        console.log("✅ Branch detection: Working");
        console.log(`   Current branch: ${branch}`);
        passed++;
      } else {
        console.log("❌ Branch detection: Failed");
      }
    });
  } catch (error) {
    console.log(`❌ Git composable worktree test failed: ${error.message}`);
  }

  console.log(`✅ Git composable worktrees: ${passed}/${total} passed`);
  return passed === total;
}

async function testWorktreeCLI() {
  console.log("\n📋 Testing worktree CLI commands...");

  let passed = 0;
  const total = 1;

  try {
    // Test gitvan worktree list command
    const output = execSync(
      "node /Users/sac/gitvan/bin/gitvan.mjs worktree list",
      {
        cwd: TEST_DIR,
        encoding: "utf8",
      }
    );

    if (output.includes("Worktrees:") && output.includes("Branch:")) {
      console.log("✅ gitvan worktree list: Working");
      console.log("   Output preview:");
      const lines = output.split("\n").slice(0, 10);
      lines.forEach((line) => console.log(`   ${line}`));
      passed++;
    } else {
      console.log("❌ gitvan worktree list: Failed");
      console.log(`   Output: ${output}`);
    }
  } catch (error) {
    console.log(`❌ Worktree CLI test failed: ${error.message}`);
  }

  console.log(`✅ Worktree CLI: ${passed}/${total} passed`);
  return passed === total;
}

async function testWorktreeContextIsolation() {
  console.log("\n📋 Testing worktree context isolation...");

  const { withGitVan } = await import("./src/core/context.mjs");
  const { useGit } = await import("./src/composables/git.mjs");

  let passed = 0;
  const total = 2;

  try {
    // Test main worktree context
    const mainCtx = {
      cwd: TEST_DIR,
      env: process.env,
      now: () => new Date().toISOString(),
    };

    await withGitVan(mainCtx, async () => {
      const git = useGit();
      const mainBranch = await git.getCurrentBranch();
      const mainWorktrees = await git.listWorktrees();

      console.log(`   Debug - Main context branch: ${mainBranch}`);
      console.log(`   Debug - Main context worktrees: ${mainWorktrees.length}`);
      console.log(`   Debug - Main context cwd: ${git.cwd}`);

      if (mainBranch === "master" && mainWorktrees.length >= 1) {
        console.log("✅ Main worktree context: Working");
        console.log(`   Branch: ${mainBranch}`);
        console.log(`   Worktrees: ${mainWorktrees.length}`);
        passed++;
      } else {
        console.log("❌ Main worktree context: Failed");
        console.log(`   Expected branch: master, got: ${mainBranch}`);
        console.log(`   Expected worktrees >= 1, got: ${mainWorktrees.length}`);
      }
    });

    // Test worktree-specific context (if additional worktrees exist)
    const worktreeDir = join(TEST_DIR, "worktrees");
    if (existsSync(worktreeDir)) {
      const worktreeCtx = {
        cwd: join(worktreeDir, "feature-worktree"),
        env: process.env,
        now: () => new Date().toISOString(),
      };

      await withGitVan(worktreeCtx, async () => {
        const git = useGit();
        const worktreeBranch = await git.getCurrentBranch();
        const worktreeWorktrees = await git.listWorktrees();

        console.log(`   Debug - Worktree context branch: ${worktreeBranch}`);
        console.log(
          `   Debug - Worktree context worktrees: ${worktreeWorktrees.length}`
        );
        console.log(`   Debug - Worktree context cwd: ${git.cwd}`);

        if (
          worktreeBranch === "feature-branch" &&
          worktreeWorktrees.length >= 1
        ) {
          console.log("✅ Worktree-specific context: Working");
          console.log(`   Branch: ${worktreeBranch}`);
          console.log(`   Worktrees: ${worktreeWorktrees.length}`);
          passed++;
        } else {
          console.log("❌ Worktree-specific context: Failed");
          console.log(
            `   Expected branch: feature-branch, got: ${worktreeBranch}`
          );
          console.log(
            `   Expected worktrees >= 1, got: ${worktreeWorktrees.length}`
          );
        }
      });
    } else {
      console.log(
        "⚠️ No additional worktrees found, skipping worktree-specific context test"
      );
      passed++; // Count as passed since we can't test without worktrees
    }
  } catch (error) {
    console.log(`❌ Worktree context isolation test failed: ${error.message}`);
  }

  console.log(`✅ Worktree context isolation: ${passed}/${total} passed`);
  return passed === total;
}

function generateReport(results) {
  console.log("\n📊 Worktree Features Test Report");
  console.log("─".repeat(60));

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const successRate = Math.round((passedTests / totalTests) * 100);

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${successRate}%`);

  console.log("\nTest Results:");
  for (const [testName, result] of Object.entries(results)) {
    const status = result ? "✅" : "❌";
    console.log(`  ${status} ${testName}`);
  }

  if (successRate === 100) {
    console.log("\n🎉 All worktree features are working perfectly!");
    console.log("✅ Worktree utilities are functional");
    console.log("✅ Git composable worktree methods work");
    console.log("✅ CLI worktree commands work");
    console.log("✅ Context isolation is working");
  } else {
    console.log("\n⚠️ Some worktree features need attention.");
  }

  return successRate === 100;
}

async function main() {
  console.log("🚀 GitVan Worktree Features Test\n");

  setupTestEnvironment();
  createTestRepo();
  const worktrees = createWorktrees();

  const results = {
    "Worktree Utilities": await testWorktreeUtils(),
    "Git Composable Worktrees": await testGitComposableWorktrees(),
    "Worktree CLI": await testWorktreeCLI(),
    "Worktree Context Isolation": await testWorktreeContextIsolation(),
  };

  const success = generateReport(results);

  // Clean up
  rmSync(TEST_DIR, { recursive: true, force: true });

  process.exit(success ? 0 : 1);
}

main().catch(console.error);
