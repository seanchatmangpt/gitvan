#!/usr/bin/env node

/**
 * useWorktree Example
 * Demonstrates the new useWorktree composable
 */

import { withGitVan } from "../src/core/context.mjs";
import { useWorktree } from "../src/composables/worktree.mjs";

async function demonstrateUseWorktree() {
  console.log("🚀 useWorktree Composable Demo\n");

  const ctx = {
    cwd: process.cwd(),
    env: process.env,
    now: () => new Date().toISOString(),
  };

  await withGitVan(ctx, async () => {
    const worktree = useWorktree();

    console.log("📋 Current Worktree Information:");
    console.log("─".repeat(40));

    // Basic worktree info
    const info = await worktree.info();
    console.log(`📍 Worktree Path: ${info.worktree}`);
    console.log(`🌿 Current Branch: ${info.branch}`);
    console.log(`🔑 HEAD Commit: ${info.head.slice(0, 8)}`);
    console.log(`📁 Git Directory: ${info.commonDir}`);

    // List all worktrees
    console.log("\n📋 All Worktrees:");
    console.log("─".repeat(40));
    const worktrees = await worktree.list();
    worktrees.forEach((wt, i) => {
      const status = wt.isMain ? " (main)" : "";
      console.log(`${i + 1}. ${wt.path}`);
      console.log(`   Branch: ${wt.branch || "detached"}`);
      console.log(`   HEAD: ${wt.head?.slice(0, 8) || "N/A"}${status}`);
    });

    // Worktree status
    console.log("\n📊 Worktree Status:");
    console.log("─".repeat(40));
    const status = await worktree.status();
    console.log(`Current: ${status.current.path}`);
    console.log(`Branch: ${status.current.branch}`);
    console.log(`Total Worktrees: ${status.count}`);
    console.log(`Is Main: ${status.isMain ? "Yes" : "No"}`);

    // Worktree key for locking
    console.log("\n🔐 Worktree Key (for locking):");
    console.log("─".repeat(40));
    const key = await worktree.key();
    console.log(`Key: ${key}`);

    console.log("\n✅ useWorktree composable is working perfectly!");
    console.log("🎯 This promotes worktree usage with a clean, focused API");
  });
}

demonstrateUseWorktree().catch(console.error);
