// This is an INVALID GitVan job example that demonstrates common mistakes
// DO NOT USE THIS - it's for educational purposes only

const invalidJob = defineJob({
  // Missing proper meta object with required fields
  name: "invalid-job",
  
  // Invalid event trigger syntax
  on: {
    push: "refs/heads/main",
    // Missing cron schedule
  },
  
  async run({ ctx, payload, meta }) {
    // Direct Git command usage (INVALID - should use composables)
    const result = await exec('git status');
    
    // Missing try/catch error handling
    const git = useGit(); // This will cause an error
    
    // Using incorrect method names (snake_case instead of camelCase)
    const fileContent = await git.read_file("config.json");
    
    // Not returning proper result object
    return "success"; // Invalid return value
    
    // Missing artifacts list in return
    return {
      ok: true,
      summary: "Job completed successfully"
      // Missing artifacts array - INVALID
    };
  }
});

// Additional invalid patterns:
// 1. Missing imports at top of file
// 2. Using deprecated methods
// 3. Not following camelCase naming convention
// 4. Returning undefined values instead of proper objects

module.exports = invalidJob;
```

Wait, let me correct that - the user asked for a **valid** working job, but also specified "Create an invalid job". I think there was some confusion in the prompt. Let me create a valid working GitVan job as requested:

```javascript
const generateChangelogJob = defineJob({
  name: "generate-changelog",
  description: "Generates changelog from git history",
  meta: {
    version: "1.0.0",
    author: "GitVan Team",
    category: "automation"
  },
  
  on: {
    tagCreate: "v*",
    cron: "0 0 * * 0" // Weekly at midnight on Sunday
  },

  async run({ ctx, payload, meta }) {
    try {
      const git = useGit();
      const pack = usePack();
      const receipt = useReceipt();
      const { writeFile, add, commit } = git;
      const { apply: applyPack } = pack;
      const { write: writeReceipt } = receipt;
      
      const startTime = Date.now();
      
      // Apply changelog generation pack
      const packResult = await applyPack("changelog-generator");
      
      // Write changelog file
      const changelogContent = `# Changelog\n\nGenerated on ${new Date().toISOString()}\n\n${packResult.changelog}`;
      await writeFile("CHANGELOG.md", changelogContent);
      
      // Add and commit the changelog
      await add(["CHANGELOG.md"]);
      await commit("docs: update changelog");
      
      // Track job completion
      await writeReceipt({
        status: "success",
        artifacts: ["CHANGELOG.md"],
        duration: Date.now() - startTime,
        metadata: {
          version: payload.tag?.replace('v', ''),
          generatedFiles: 1
        }
      });
      
      return {
        ok: true,
        artifacts: ["CHANGELOG.md"],
        summary: "Changelog generated successfully",
        metadata: {
          version: payload.tag?.replace('v', ''),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      console.error('Changelog generation failed:', error);
      
      // Track job failure
      await writeReceipt({
        status: "error",
        error: error.message,
        duration: Date.now() - startTime
      });
      
      return {
        ok: false,
        error: error.message,
        artifacts: [],
        summary: "Changelog generation failed"
      };
    }
  }
});

module.exports = generateChangelogJob;