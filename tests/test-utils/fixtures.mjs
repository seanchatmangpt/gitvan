/**
 * Test Fixtures - Common test data and factory functions
 * Provides reusable test fixtures for job and job bridge tests
 */

/**
 * Create a job definition from options
 * @param {Object} options - Job definition options
 * @returns {Object} Job definition
 */
export function createJobDefinition(options = {}) {
  const {
    id = null,
    name = 'test-job',
    file = null,
    cron = null,
    interval = null,
    timeout = 30000,
    ttl = 300000,
    description = 'Test job definition'
  } = options;

  // Validate required fields
  if (!id && !name) {
    throw new Error('Job definition requires either id or name');
  }

  return {
    id: id || `job-${name}`,
    name: name || 'job',
    file: file || `/jobs/${name}.mjs`,
    cron,
    interval,
    timeout,
    ttl,
    description
  };
}

/**
 * Create multiple job definitions
 * @param {Array} jobConfigs - Array of job config objects
 * @returns {Object[]} Array of job definitions
 */
export function createJobDefinitions(jobConfigs = []) {
  return jobConfigs.map(config => createJobDefinition(config));
}

/**
 * Create a cron-based job definition
 * @param {string} jobName - Job name
 * @param {string} cronExpression - Cron expression
 * @param {Object} options - Additional options
 * @returns {Object} Job definition
 */
export function createCronJobDefinition(jobName, cronExpression, options = {}) {
  return createJobDefinition({
    ...options,
    name: jobName,
    cron: cronExpression
  });
}

/**
 * Create an interval-based job definition
 * @param {string} jobName - Job name
 * @param {string} intervalExpression - Interval expression
 * @param {Object} options - Additional options
 * @returns {Object} Job definition
 */
export function createIntervalJobDefinition(jobName, intervalExpression, options = {}) {
  return createJobDefinition({
    ...options,
    name: jobName,
    interval: intervalExpression
  });
}

/**
 * Create a one-time job definition (no schedule)
 * @param {string} jobName - Job name
 * @param {Object} options - Additional options
 * @returns {Object} Job definition
 */
export function createOnceJobDefinition(jobName, options = {}) {
  return createJobDefinition({
    ...options,
    name: jobName
  });
}

/**
 * Create a mock worker configuration
 * @param {string} jobName - Job name
 * @param {Object} options - Worker options
 * @returns {Object} Worker configuration
 */
export function createWorkerConfig(jobName, options = {}) {
  return {
    workerData: {
      jobId: jobName,
      ...options.workerData
    },
    ...options
  };
}

/**
 * Create a mock job execution result
 * @param {string} jobName - Job name
 * @param {Object} options - Result options
 * @returns {Object} Execution result
 */
export function createJobExecutionResult(jobName, options = {}) {
  const {
    success = true,
    duration = 100,
    timestamp = new Date().toISOString()
  } = options;

  return {
    jobName,
    success,
    duration,
    timestamp,
    ...options
  };
}

/**
 * Create a bree job configuration
 * @param {Object} jobDef - Job definition
 * @param {Object} options - Additional options
 * @returns {Object} Bree job configuration
 */
export function createBreeJobConfig(jobDef, options = {}) {
  const config = {
    name: jobDef.name || jobDef.id,
    path: jobDef.file || `/jobs/${jobDef.name}.mjs`,
    ...options
  };

  if (jobDef.cron) {
    config.cron = jobDef.cron;
  }

  if (jobDef.interval) {
    config.interval = jobDef.interval;
  }

  if (jobDef.timeout) {
    config.timeout = jobDef.timeout;
  }

  return config;
}

/**
 * Batch create job definitions from names
 * @param {string[]} jobNames - Array of job names
 * @param {Object} options - Common options for all jobs
 * @returns {Object[]} Array of job definitions
 */
export function createJobsFromNames(jobNames = [], options = {}) {
  return jobNames.map(name => createJobDefinition({
    ...options,
    name
  }));
}

/**
 * Create a fixture set of jobs with different schedules
 * @returns {Object}
 */
export function createJobFixtureSet() {
  return {
    immediate: createOnceJobDefinition('immediate-job'),
    cron: createCronJobDefinition('cron-job', '0 * * * *'),
    interval: createIntervalJobDefinition('interval-job', '5m'),
    timeout: createJobDefinition({
      name: 'timeout-job',
      timeout: 1000
    }),
    ttl: createJobDefinition({
      name: 'ttl-job',
      ttl: 60000
    })
  };
}
