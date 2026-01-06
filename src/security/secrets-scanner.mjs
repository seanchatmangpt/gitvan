/**
 * Secrets Scanner - Detect secrets in code before commit
 * Prevents accidental commit of API keys, passwords, tokens
 */

import { readFile } from 'node:fs/promises';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('secrets-scanner');

/**
 * Secret patterns to detect
 */
const SECRET_PATTERNS = [
  // Generic API keys
  {
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey)["\s:=]+["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
    severity: 'high'
  },

  // Generic secrets
  {
    name: 'Generic Secret',
    pattern: /(?:secret|password|passwd|pwd)["\s:=]+["']?([a-zA-Z0-9_\-!@#$%^&*()]{8,})["']?/gi,
    severity: 'high'
  },

  // AWS
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical'
  },
  {
    name: 'AWS Secret Key',
    pattern: /(?:aws[_-]?secret[_-]?access[_-]?key|aws[_-]?secret)["\s:=]+["']?([a-zA-Z0-9/+=]{40})["']?/gi,
    severity: 'critical'
  },

  // GitHub
  {
    name: 'GitHub Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    severity: 'critical'
  },
  {
    name: 'GitHub OAuth',
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    severity: 'critical'
  },

  // GitLab
  {
    name: 'GitLab Token',
    pattern: /glpat-[a-zA-Z0-9_\-]{20}/g,
    severity: 'critical'
  },

  // Slack
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/g,
    severity: 'high'
  },
  {
    name: 'Slack Webhook',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g,
    severity: 'high'
  },

  // Anthropic
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-api03-[a-zA-Z0-9_\-]{95}/g,
    severity: 'critical'
  },

  // OpenAI
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    severity: 'critical'
  },

  // Google Cloud
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z_\-]{35}/g,
    severity: 'critical'
  },

  // Private SSH keys
  {
    name: 'SSH Private Key',
    pattern: /-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/g,
    severity: 'critical'
  },

  // JWT tokens
  {
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g,
    severity: 'medium'
  },

  // Database connection strings
  {
    name: 'Database Connection String',
    pattern: /(?:mongodb|mysql|postgresql|postgres):\/\/[^\s]+/gi,
    severity: 'high'
  },

  // Generic tokens
  {
    name: 'Generic Token',
    pattern: /(?:token|auth[_-]?token)["\s:=]+["']?([a-zA-Z0-9_\-]{32,})["']?/gi,
    severity: 'medium'
  },

  // Private keys in JSON
  {
    name: 'Private Key in JSON',
    pattern: /"private[_-]?key":\s*"[^"]+"/gi,
    severity: 'high'
  },
];

/**
 * Files to always ignore
 */
const IGNORE_PATTERNS = [
  /node_modules\//,
  /\.git\//,
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/,
  /\.ico$/,
  /\.woff$/,
  /\.woff2$/,
  /\.ttf$/,
  /\.eot$/,
  /\.min\.js$/,
  /\.min\.css$/,
  /\.map$/,
  // Documentation that might contain example secrets
  /README\.md$/,
  /SECURITY\.md$/,
  /\.md$/i,  // Be cautious with markdown files
];

/**
 * Check if file should be ignored
 * @param {string} filePath - File path to check
 * @returns {boolean} True if should be ignored
 */
function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Scan content for secrets
 * @param {string} content - Content to scan
 * @param {string} filePath - File path (for context)
 * @returns {Array<object>} Detected secrets
 */
export function scanContentForSecrets(content, filePath = 'unknown') {
  const findings = [];

  for (const { name, pattern, severity } of SECRET_PATTERNS) {
    const matches = content.matchAll(pattern);

    for (const match of matches) {
      // Get line number
      const before = content.substring(0, match.index);
      const lineNumber = (before.match(/\n/g) || []).length + 1;

      // Get context (the line where the match was found)
      const lines = content.split('\n');
      const line = lines[lineNumber - 1];

      findings.push({
        name,
        severity,
        filePath,
        lineNumber,
        match: match[0].substring(0, 50) + (match[0].length > 50 ? '...' : ''),
        context: line.trim().substring(0, 100)
      });
    }
  }

  return findings;
}

/**
 * Scan a file for secrets
 * @param {string} filePath - Path to file to scan
 * @returns {Array<object>} Detected secrets
 */
export async function scanFile(filePath) {
  if (shouldIgnoreFile(filePath)) {
    return [];
  }

  try {
    const content = await readFile(filePath, 'utf8');
    return scanContentForSecrets(content, filePath);
  } catch (error) {
    logger.warn(`Failed to scan file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Scan multiple files for secrets
 * @param {Array<string>} filePaths - Paths to files to scan
 * @returns {object} Scan results
 */
export async function scanFiles(filePaths) {
  const allFindings = [];

  for (const filePath of filePaths) {
    const findings = await scanFile(filePath);
    allFindings.push(...findings);
  }

  // Group by severity
  const grouped = {
    critical: allFindings.filter(f => f.severity === 'critical'),
    high: allFindings.filter(f => f.severity === 'high'),
    medium: allFindings.filter(f => f.severity === 'medium'),
    low: allFindings.filter(f => f.severity === 'low')
  };

  return {
    totalFindings: allFindings.length,
    findings: allFindings,
    bySeverity: grouped,
    criticalCount: grouped.critical.length,
    highCount: grouped.high.length,
    mediumCount: grouped.medium.length,
    lowCount: grouped.low.length
  };
}

/**
 * Format scan results for display
 * @param {object} results - Scan results
 * @returns {string} Formatted output
 */
export function formatScanResults(results) {
  if (results.totalFindings === 0) {
    return '✅ No secrets detected';
  }

  let output = `\n🚨 Secrets Scanner - ${results.totalFindings} potential secret(s) found\n\n`;

  // Group by severity
  for (const severity of ['critical', 'high', 'medium', 'low']) {
    const findings = results.bySeverity[severity];
    if (findings.length === 0) continue;

    output += `${severity.toUpperCase()} (${findings.length}):\n`;

    for (const finding of findings) {
      output += `  ${finding.filePath}:${finding.lineNumber}\n`;
      output += `    ${finding.name}\n`;
      output += `    ${finding.context}\n\n`;
    }
  }

  output += '\n⚠️  Please review these findings and ensure no real secrets are committed.\n';
  output += '💡 Use environment variables for secrets instead.\n';

  return output;
}

/**
 * Pre-commit hook handler
 * @param {Array<string>} stagedFiles - List of staged files
 * @returns {object} Hook result
 */
export async function preCommitHook(stagedFiles) {
  logger.info('Running secrets scanner on staged files...');

  const results = await scanFiles(stagedFiles);

  if (results.criticalCount > 0 || results.highCount > 0) {
    logger.error('Critical or high-severity secrets detected!');
    console.error(formatScanResults(results));

    return {
      passed: false,
      message: 'Secrets detected - commit blocked',
      results
    };
  }

  if (results.mediumCount > 0 || results.lowCount > 0) {
    logger.warn('Medium or low-severity secrets detected');
    console.warn(formatScanResults(results));
  }

  return {
    passed: true,
    message: 'No critical secrets detected',
    results
  };
}
