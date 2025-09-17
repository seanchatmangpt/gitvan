import { readdirSync, statSync } from "node:fs";
import { join, extname, resolve } from "pathe";

/**
 * Discovers jobs by scanning the jobs/ directory
 * Maps filesystem paths to job definitions and metadata
 */
export function discoverJobs(jobsDir) {
  const jobs = [];

  if (!jobsDir) return jobs;

  // Check if jobs directory exists and is accessible
  try {
    const stat = statSync(jobsDir);
    if (!stat.isDirectory()) return jobs;
  } catch {
    return jobs;
  }

  try {
    scanDirectory(jobsDir, "", jobs);
  } catch (err) {
    // Jobs directory doesn't exist or isn't readable
    return jobs;
  }

  return jobs;
}

function scanDirectory(baseDir, relativePath, jobs) {
  const fullPath = join(baseDir, relativePath);

  try {
    const entries = readdirSync(fullPath);

    for (const entry of entries) {
      const entryPath = join(fullPath, entry);
      const relativeEntryPath = join(relativePath, entry);

      try {
        const stat = statSync(entryPath);

        if (stat.isDirectory()) {
          // Recursively scan subdirectories
          scanDirectory(baseDir, relativeEntryPath, jobs);
        } else if (stat.isFile() && extname(entry) === ".mjs") {
          // Found a job file
          const jobId = relativeEntryPath
            .replace(/\.mjs$/, "")
            .replace(/\\/g, "/");
          jobs.push({
            id: jobId,
            file: entryPath,
            relativePath: relativeEntryPath,
            name: entry.replace(/\.mjs$/, ""),
            directory: relativePath || ".",
          });
        }
      } catch {
        // Skip inaccessible files
        continue;
      }
    }
  } catch {
    // Directory not readable
    return;
  }
}

/**
 * Find a specific job file by name
 */
export function findJobFile(jobsDir, jobName) {
  const jobs = discoverJobs(jobsDir);

  // Try exact match first
  let job = jobs.find((j) => j.id === jobName || j.name === jobName);

  if (job) return job.file;

  // Try partial matches
  job = jobs.find(
    (j) =>
      j.id.includes(jobName) ||
      j.name.includes(jobName) ||
      j.id.endsWith(`/${jobName}`),
  );

  return job?.file || null;
}

/**
 * Find all jobs in a directory
 */
export function findAllJobs(jobsDir) {
  const jobs = discoverJobs(jobsDir);
  return jobs.map((j) => j.id);
}

/**
 * Load job definition from file
 */
export async function loadJobDefinition(jobFile) {
  try {
    const jobMod = await import(`file://${jobFile}`);

    // Job modules can export either:
    // 1. A default function
    // 2. A named export with metadata
    // 3. Both

    if (jobMod.default && typeof jobMod.default === "function") {
      return {
        run: jobMod.default,
        meta: jobMod.meta || {},
        ...jobMod,
      };
    }

    // Look for common job export patterns
    if (jobMod.run && typeof jobMod.run === "function") {
      return jobMod;
    }

    if (jobMod.job && typeof jobMod.job === "function") {
      return {
        run: jobMod.job,
        meta: jobMod.meta || {},
        ...jobMod,
      };
    }

    // If no clear run function, return the module as-is
    return jobMod;
  } catch (err) {
    console.warn(`Failed to load job from ${jobFile}:`, err.message);
    return null;
  }
}

/**
 * Get job metadata without loading the full module
 */
export function getJobMetadata(jobFile) {
  try {
    const stat = statSync(jobFile);
    return {
      file: jobFile,
      size: stat.size,
      modified: stat.mtime,
      created: stat.birthtime,
    };
  } catch {
    return null;
  }
}

/**
 * Validate job definition structure
 */
export function validateJobDefinition(jobDef) {
  if (!jobDef) return false;

  // Must have a run function
  if (typeof jobDef.run !== "function") {
    return false;
  }

  // Optional metadata validation
  if (jobDef.meta) {
    if (typeof jobDef.meta !== "object") {
      return false;
    }
  }

  return true;
}
