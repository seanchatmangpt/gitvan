// examples/useGit-example.mjs
// Example demonstrating the fixed useGit composable

import { useGit } from "../src/composables/git.mjs";
import { withGitVan } from "../src/composables/ctx.mjs";

async function demonstrateUseGit() {
  console.log("=== useGit Demonstration ===\n");

  // Example 1: Basic usage without context
  console.log("1. Basic usage:");
  const git = useGit();
  console.log("Working directory:", git.cwd);
  console.log("Environment TZ:", git.env.TZ);
  console.log("Environment LANG:", git.env.LANG);
  console.log("");

  // Example 2: Usage with context
  console.log("2. Usage with context:");
  const mockContext = {
    cwd: "/custom/repo/path",
    env: {
      CUSTOM_VAR: "custom-value",
      TZ: "America/New_York", // This should be overridden by useGit
    },
    now: () => "2024-01-01T12:00:00.000Z",
  };

  await withGitVan(mockContext, async () => {
    const gitWithContext = useGit();
    console.log("Context working directory:", gitWithContext.cwd);
    console.log("Context environment TZ:", gitWithContext.env.TZ); // Should be UTC
    console.log("Context environment LANG:", gitWithContext.env.LANG); // Should be C
    console.log(
      "Context environment CUSTOM_VAR:",
      gitWithContext.env.CUSTOM_VAR,
    );
    console.log("Context nowISO:", gitWithContext.nowISO());
    console.log("");
  });

  // Example 3: Repository operations (if in a git repo)
  console.log("3. Repository operations:");
  try {
    const currentBranch = await git.getCurrentBranch();
    console.log("Current branch:", currentBranch);

    const isClean = await git.isClean();
    console.log("Repository is clean:", isClean);

    const commitCount = await git.getCommitCount();
    console.log("Commit count:", commitCount);
  } catch (error) {
    console.log("Not in a git repository or error:", error.message);
  }

  console.log("\n=== Demonstration Complete ===");
}

// Run the demonstration
demonstrateUseGit().catch(console.error);
