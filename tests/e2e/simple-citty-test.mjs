#!/usr/bin/env node

/**
 * Simple E2E Test for GitVan CLI
 *
 * Basic test to verify CLI functionality
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

async function runSimpleTest() {
  console.log("🧪 Simple E2E Test for GitVan CLI");
  console.log("=================================");

  try {
    // Test CLI help command
    console.log("\n1️⃣ Testing CLI help command");

    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["src/cli.mjs", "--help"], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        resolve({
          code,
          stdout,
          stderr,
        });
      });

      child.on("error", (error) => {
        reject(error);
      });
    });

    console.log("Exit code:", result.code);
    console.log("Stdout:", result.stdout);
    console.log("Stderr:", result.stderr);

    if (result.code === 0) {
      console.log("✅ CLI help command executed successfully");

      if (
        result.stdout.includes("Git-native development automation platform")
      ) {
        console.log("✅ CLI help contains expected text");
      } else {
        console.log("❌ CLI help does not contain expected text");
        console.log("Expected: 'Git-native development automation platform'");
        console.log("Actual output:", result.stdout);
      }
    } else {
      console.log("❌ CLI help command failed with exit code:", result.code);
    }

    // Test graph command
    console.log("\n2️⃣ Testing graph command");

    const graphResult = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["src/cli.mjs", "graph", "--help"],
        {
          cwd: process.cwd(),
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        resolve({
          code,
          stdout,
          stderr,
        });
      });

      child.on("error", (error) => {
        reject(error);
      });
    });

    console.log("Graph command exit code:", graphResult.code);
    console.log("Graph command stdout:", graphResult.stdout);

    if (graphResult.code === 0) {
      console.log("✅ Graph command executed successfully");
    } else {
      console.log("❌ Graph command failed with exit code:", graphResult.code);
    }

    console.log("\n🎉 Simple E2E Test Complete!");
  } catch (error) {
    console.error("❌ Test Error:", error.message);
    process.exit(1);
  }
}

runSimpleTest();
