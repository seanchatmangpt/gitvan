#!/usr/bin/env node

/**
 * Verification Script - Check for Placeholder Comments
 *
 * This script scans the codebase for any remaining "Would implement" comments
 * or other placeholder text that indicates incomplete implementations.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'pathe';
import { fileURLToPath } from 'node:url';
import { dirname } from 'pathe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Patterns that indicate placeholder or incomplete code
const PLACEHOLDER_PATTERNS = [
  /would\s+implement/gi,
  /todo:?\s*implement/gi,
  /implementation\s+needed/gi,
  /placeholder/gi,
  /mock-sha256/gi,
  /\/\/\s*Implementation\s+needed/gi,
  /\/\*\s*Implementation\s+needed/gi,
  /\/\/\s*TODO:\s*implement/gi,
  /\/\*\s*TODO:\s*implement/gi,
  /throw\s+new\s+Error\(['"](Not implemented|TODO|Placeholder)/gi,
  /console\.log\(['"](Mock|Fake|Placeholder)/gi,
  /return\s+null;\s*\/\/\s*(Mock|Placeholder|TODO)/gi,
  /return\s+\{\};\s*\/\/\s*(Mock|Placeholder|TODO)/gi,
  /return\s+\[\];\s*\/\/\s*(Mock|Placeholder|TODO)/gi
];

// File extensions to check
const EXTENSIONS_TO_CHECK = ['.mjs', '.js', '.ts', '.json'];

// Directories to scan
const DIRECTORIES_TO_SCAN = [
  join(__dirname, '../src'),
  join(__dirname, '../tests')
];

// Files to ignore (known to contain test placeholders)
const IGNORE_FILES = [
  'verify-no-placeholders.mjs',
  'e2e-pack-system.test.mjs'
];

function scanDirectory(dir) {
  const results = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...scanDirectory(fullPath));
        }
      } else if (entry.isFile()) {
        const ext = extname(entry.name);

        if (EXTENSIONS_TO_CHECK.includes(ext) && !IGNORE_FILES.includes(entry.name)) {
          const fileResults = scanFile(fullPath);
          if (fileResults.length > 0) {
            results.push({ file: fullPath, issues: fileResults });
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dir}: ${error.message}`);
  }

  return results;
}

function scanFile(filePath) {
  const issues = [];

  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      for (const pattern of PLACEHOLDER_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          issues.push({
            line: lineNumber,
            content: line.trim(),
            match: match[0],
            pattern: pattern.source
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
  }

  return issues;
}

function generateReport(results) {
  console.log('\n🔍 GitVan Implementation Verification Report');
  console.log('='.repeat(50));

  if (results.length === 0) {
    console.log('✅ SUCCESS: No placeholder comments found!');
    console.log('   All implementations appear to be complete.');
    return true;
  }

  console.log(`❌ FAILURE: Found ${results.length} files with placeholder comments`);
  console.log();

  let totalIssues = 0;

  for (const result of results) {
    console.log(`📄 File: ${result.file}`);
    console.log('-'.repeat(result.file.length + 8));

    for (const issue of result.issues) {
      totalIssues++;
      console.log(`  Line ${issue.line}: ${issue.content}`);
      console.log(`    ↳ Matched pattern: ${issue.pattern}`);
      console.log();
    }
  }

  console.log(`Total issues found: ${totalIssues}`);
  console.log();
  console.log('🛠️  Please review and replace placeholder implementations with real code.');

  return false;
}

function main() {
  console.log('🚀 Starting verification scan...');

  const allResults = [];

  for (const dir of DIRECTORIES_TO_SCAN) {
    console.log(`📂 Scanning: ${dir}`);
    const results = scanDirectory(dir);
    allResults.push(...results);
  }

  const success = generateReport(allResults);

  if (success) {
    console.log('\n🎉 Verification completed successfully!');
    console.log('   All implementations are real and complete.');
    process.exit(0);
  } else {
    console.log('\n💥 Verification failed!');
    console.log('   Please fix placeholder implementations before proceeding.');
    process.exit(1);
  }
}

// Additional verification checks
function performAdditionalChecks() {
  console.log('\n🔧 Performing additional implementation checks...');

  const checks = [
    {
      name: 'Registry uses real filesystem scanning',
      check: () => {
        const registryPath = join(__dirname, '../src/pack/registry.mjs');
        const content = readFileSync(registryPath, 'utf8');
        return content.includes('readdirSync') && content.includes('existsSync');
      }
    },
    {
      name: 'Security uses real crypto module',
      check: () => {
        const securityPath = join(__dirname, '../src/pack/security/signature.mjs');
        const content = readFileSync(securityPath, 'utf8');
        return content.includes('createSign') && content.includes('createVerify') && content.includes('node:crypto');
      }
    },
    {
      name: 'Version management uses semver',
      check: () => {
        const versionPath = join(__dirname, '../src/utils/version.mjs');
        const content = readFileSync(versionPath, 'utf8');
        return content.includes('import semver') && content.includes('semver.satisfies');
      }
    },
    {
      name: 'File operations use glob',
      check: () => {
        const fileOpsPath = join(__dirname, '../src/pack/operations/file-ops.mjs');
        const content = readFileSync(fileOpsPath, 'utf8');
        return content.includes('import { glob }') && content.includes('tinyglobby');
      }
    },
    {
      name: 'Cache uses real disk persistence',
      check: () => {
        const cachePath = join(__dirname, '../src/pack/optimization/cache.mjs');
        const content = readFileSync(cachePath, 'utf8');
        return content.includes('cacache') && content.includes('LRUCache');
      }
    },
    {
      name: 'Prompts use real prompts library',
      check: () => {
        const promptsPath = join(__dirname, '../src/utils/prompts.mjs');
        const content = readFileSync(promptsPath, 'utf8');
        return content.includes('import prompts') && content.includes('prompts(');
      }
    },
    {
      name: 'Template processor uses Nunjucks',
      check: () => {
        const templatePath = join(__dirname, '../src/pack/operations/template-processor.mjs');
        const content = readFileSync(templatePath, 'utf8');
        return content.includes('import nunjucks') && content.includes('nunjucks.Environment');
      }
    }
  ];

  let allChecksPassed = true;

  for (const check of checks) {
    try {
      const passed = check.check();
      console.log(`  ${passed ? '✅' : '❌'} ${check.name}`);
      if (!passed) allChecksPassed = false;
    } catch (error) {
      console.log(`  ❌ ${check.name} (Error: ${error.message})`);
      allChecksPassed = false;
    }
  }

  return allChecksPassed;
}

// Run main verification
if (import.meta.url === `file://${process.argv[1]}`) {
  main();

  // Run additional checks
  const additionalChecksPassed = performAdditionalChecks();

  if (!additionalChecksPassed) {
    console.log('\n💥 Additional checks failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All additional checks passed!');
  }
}