#!/usr/bin/env node

/**
 * Test README Frontmatter with GitVan Frontmatter Utility
 * Ensures the README frontmatter works with our custom frontmatter parser
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./src/utils/frontmatter.mjs";

const README_PATH = join(process.cwd(), "README.md");

function testWithGitVanFrontmatter() {
  console.log("🧪 Testing README with GitVan Frontmatter Utility...\n");

  try {
    // Read the README file
    const readmeContent = readFileSync(README_PATH, "utf8");
    console.log("✅ README file read successfully");

    // Parse using GitVan frontmatter utility
    const result = parseFrontmatter(readmeContent);
    console.log("✅ Frontmatter parsed with GitVan utility");

    // Check if frontmatter exists
    if (!result.data || Object.keys(result.data).length === 0) {
      console.log("❌ No frontmatter data found");
      return false;
    }

    console.log("✅ Frontmatter data found");

    // Display parsed frontmatter
    console.log("\n📋 Parsed Frontmatter (GitVan Utility):");
    console.log("─".repeat(50));
    for (const [key, value] of Object.entries(result.data)) {
      console.log(`${key}: ${JSON.stringify(value)}`);
    }
    console.log("─".repeat(50));

    // Check body content
    if (!result.body || result.body.trim().length === 0) {
      console.log("❌ No body content found");
      return false;
    }

    console.log("✅ Body content found");

    // Check that body starts with expected content
    const expectedStart = "# GitVan v2";
    if (!result.body.trim().startsWith(expectedStart)) {
      console.log(`❌ Body should start with '${expectedStart}'`);
      return false;
    }

    console.log("✅ Body content starts correctly");

    // Validate required fields
    const requiredFields = [
      "title",
      "description",
      "version",
      "author",
      "license",
    ];
    const missingFields = requiredFields.filter((field) => !result.data[field]);

    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(", ")}`);
      return false;
    }

    console.log("✅ All required fields present");

    console.log("\n🎉 README frontmatter works perfectly with GitVan utility!");
    return true;
  } catch (error) {
    console.log(
      `❌ Error parsing README with GitVan utility: ${error.message}`
    );
    return false;
  }
}

function main() {
  console.log("🚀 GitVan Frontmatter Utility Test\n");

  const success = testWithGitVanFrontmatter();

  if (success) {
    console.log(
      "\n✅ All tests passed! README frontmatter is fully compatible."
    );
    process.exit(0);
  } else {
    console.log(
      "\n❌ Some tests failed. Please check the frontmatter implementation."
    );
    process.exit(1);
  }
}

main();
