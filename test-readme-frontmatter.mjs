#!/usr/bin/env node

/**
 * Test README YAML Frontmatter Parsing
 * Ensures the README frontmatter is valid YAML and can be parsed correctly
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const README_PATH = join(process.cwd(), "README.md");

function testReadmeFrontmatter() {
  console.log("🧪 Testing README YAML Frontmatter...\n");

  try {
    // Read the README file
    const readmeContent = readFileSync(README_PATH, "utf8");
    console.log("✅ README file read successfully");

    // Parse frontmatter using gray-matter
    const parsed = matter(readmeContent);
    console.log("✅ Frontmatter parsed successfully");

    // Check if frontmatter exists
    if (!parsed.data || Object.keys(parsed.data).length === 0) {
      console.log("❌ No frontmatter found in README");
      return false;
    }

    console.log("✅ Frontmatter data found");

    // Display parsed frontmatter
    console.log("\n📋 Parsed Frontmatter:");
    console.log("─".repeat(40));
    for (const [key, value] of Object.entries(parsed.data)) {
      console.log(`${key}: ${JSON.stringify(value)}`);
    }
    console.log("─".repeat(40));

    // Validate required fields
    const requiredFields = [
      "title",
      "description",
      "version",
      "author",
      "license",
    ];
    const missingFields = requiredFields.filter((field) => !parsed.data[field]);

    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(", ")}`);
      return false;
    }

    console.log("✅ All required fields present");

    // Validate field types
    const validations = [
      { field: "title", type: "string", value: parsed.data.title },
      { field: "description", type: "string", value: parsed.data.description },
      { field: "version", type: "string", value: parsed.data.version },
      { field: "author", type: "string", value: parsed.data.author },
      { field: "license", type: "string", value: parsed.data.license },
      { field: "tags", type: "array", value: parsed.data.tags },
    ];

    for (const { field, type, value } of validations) {
      if (type === "string" && typeof value !== "string") {
        console.log(
          `❌ Field '${field}' should be a string, got ${typeof value}`
        );
        return false;
      }
      if (type === "array" && !Array.isArray(value)) {
        console.log(
          `❌ Field '${field}' should be an array, got ${typeof value}`
        );
        return false;
      }
    }

    console.log("✅ All field types are correct");

    // Check that body content exists
    if (!parsed.content || parsed.content.trim().length === 0) {
      console.log("❌ No body content found after frontmatter");
      return false;
    }

    console.log("✅ Body content found");

    // Check that body starts with expected content
    const expectedStart = "# GitVan v2";
    if (!parsed.content.trim().startsWith(expectedStart)) {
      console.log(
        `❌ Body should start with '${expectedStart}', got: ${parsed.content
          .trim()
          .substring(0, 50)}...`
      );
      return false;
    }

    console.log("✅ Body content starts correctly");

    console.log("\n🎉 README YAML frontmatter is valid and working correctly!");
    return true;
  } catch (error) {
    console.log(`❌ Error parsing README frontmatter: ${error.message}`);
    return false;
  }
}

function testFrontmatterFormats() {
  console.log("\n🧪 Testing different frontmatter formats...\n");

  const testCases = [
    {
      name: "YAML (current format)",
      content: `---
title: "Test"
description: "Test description"
version: "1.0.0"
tags: ["test", "yaml"]
---
# Test Content
This is test content.`,
    },
    {
      name: "TOML format",
      content: `+++
title = "Test"
description = "Test description"
version = "1.0.0"
tags = ["test", "toml"]
+++
# Test Content
This is test content.`,
    },
    {
      name: "JSON format",
      content: `;{"title":"Test","description":"Test description","version":"1.0.0","tags":["test","json"]}
# Test Content
This is test content.`,
    },
  ];

  for (const testCase of testCases) {
    try {
      const parsed = matter(testCase.content);
      console.log(`✅ ${testCase.name}: Parsed successfully`);
      console.log(`   Title: ${parsed.data.title}`);
      console.log(`   Tags: ${JSON.stringify(parsed.data.tags)}`);
    } catch (error) {
      console.log(`❌ ${testCase.name}: Failed to parse - ${error.message}`);
    }
  }
}

function main() {
  console.log("🚀 README Frontmatter Validation\n");

  const success = testReadmeFrontmatter();
  testFrontmatterFormats();

  if (success) {
    console.log(
      "\n✅ All tests passed! README frontmatter is working correctly."
    );
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed. Please fix the README frontmatter.");
    process.exit(1);
  }
}

main();
