/**
 * GitVan Rate Limiter and Circuit Breaker
 *
 * Features:
 * - Token bucket rate limiting
 * - Circuit breaker for external APIs
 * - Exponential backoff
 * - Request queuing
 * - Per-service configuration
 */

import { createLogger } from "./logger.mjs";
import { RateLimitError, TimeoutError } from "../core/errors.mjs";

const logger = createLogger("rate-limiter");

/**
 * Token Bucket Rate Limiter
 */
export class RateLimiter {
  /**
   * @param {object} options - Rate limiter options
   * @param {number} [options.maxTokens=10] - Maximum tokens in bucket
   * @param {number} [options.refillRate=1] - Tokens refilled per second
   * @param {number} [options.refillInterval=1000] - Refill interval in ms
   */
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 10;
    this.refillRate = options.refillRate || 1;
    this.refillInterval = options.refillInterval || 1000;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.queue = [];
    this.processing = false;

    // Start refill timer
    this.refillTimer = setInterval(() => {
      this.refill();
    }, this.refillInterval);
  }

  /**
   * Refill tokens
   */
  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = Math.floor(elapsed * this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;

      logger.debug("Tokens refilled", {
        tokens: this.tokens,
        maxTokens: this.maxTokens,
      });

      // Process queue
      this.processQueue();
    }
  }

  /**
   * Acquire token(s)
   * @param {number} [count=1] - Number of tokens to acquire
   * @returns {Promise<void>}
   * @throws {RateLimitError} If rate limit exceeded
   */
  async acquire(count = 1) {
    if (count > this.maxTokens) {
      throw new RateLimitError(
        `Requested ${count} tokens exceeds maximum ${this.maxTokens}`
      );
    }

    // Try immediate acquisition
    if (this.tokens >= count) {
      this.tokens -= count;
      logger.debug("Tokens acquired", {
        count,
        remaining: this.tokens,
      });
      return;
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove from queue
        const index = this.queue.indexOf(request);
        if (index > -1) {
          this.queue.splice(index, 1);
        }
        reject(new TimeoutError(30000, "Token acquisition"));
      }, 30000); // 30 second timeout

      const request = {
        count,
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      };

      this.queue.push(request);

      logger.debug("Request queued", {
        count,
        queueLength: this.queue.length,
      });
    });
  }

  /**
   * Process queued requests
   */
  processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0 && this.tokens > 0) {
        const request = this.queue[0];

        if (this.tokens >= request.count) {
          this.queue.shift();
          this.tokens -= request.count;

          logger.debug("Queued request processed", {
            count: request.count,
            remaining: this.tokens,
            queueLength: this.queue.length,
          });

          request.resolve();
        } else {
          break;
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      tokens: this.tokens,
      maxTokens: this.maxTokens,
      queueLength: this.queue.length,
      refillRate: this.refillRate,
    };
  }

  /**
   * Stop rate limiter
   */
  stop() {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }

    // Reject all queued requests
    for (const request of this.queue) {
      request.reject(new Error("Rate limiter stopped"));
    }
    this.queue = [];
  }
}

/**
 * Circuit Breaker States
 */
const CircuitState = {
  CLOSED: "closed", // Normal operation
  OPEN: "open", // Failing, reject requests
  HALF_OPEN: "half-open", // Testing if recovered
};

/**
 * Circuit Breaker for external APIs
 */
export class CircuitBreaker {
  /**
   * @param {object} options - Circuit breaker options
   * @param {number} [options.failureThreshold=5] - Failures before opening
   * @param {number} [options.successThreshold=2] - Successes before closing from half-open
   * @param {number} [options.timeout=30000] - Request timeout in ms
   * @param {number} [options.resetTimeout=60000] - Time before trying half-open in ms
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 30000;
    this.resetTimeout = options.resetTimeout || 60000;

    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.resetTimer = null;
  }

  /**
   * Execute function with circuit breaker
   * @template T
   * @param {() => Promise<T>} fn - Function to execute
   * @returns {Promise<T>}
   * @throws {Error} If circuit is open or function fails
   */
  async execute(fn) {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - this.lastFailure;

      if (timeSinceFailure < this.resetTimeout) {
        throw new Error(
          `Circuit breaker is OPEN. Try again in ${Math.ceil((this.resetTimeout - timeSinceFailure) / 1000)}s`
        );
      }

      // Try half-open
      logger.info("Circuit breaker transitioning to HALF_OPEN");
      this.state = CircuitState.HALF_OPEN;
      this.successes = 0;
    }

    try {
      // Execute with timeout
      const result = await this.withTimeout(fn, this.timeout);

      // Success
      this.onSuccess();

      return result;
    } catch (error) {
      // Failure
      this.onFailure(error);

      throw error;
    }
  }

  /**
   * Execute with timeout
   * @template T
   * @param {() => Promise<T>} fn - Function to execute
   * @param {number} timeoutMs - Timeout in ms
   * @returns {Promise<T>}
   */
  async withTimeout(fn, timeoutMs) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(timeoutMs, "Circuit breaker")),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Handle success
   */
  onSuccess() {
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;

      logger.info("Circuit breaker success in HALF_OPEN", {
        successes: this.successes,
        threshold: this.successThreshold,
      });

      if (this.successes >= this.successThreshold) {
        logger.info("Circuit breaker transitioning to CLOSED");
        this.state = CircuitState.CLOSED;
        this.successes = 0;
      }
    }
  }

  /**
   * Handle failure
   * @param {Error} error - Error that occurred
   */
  onFailure(error) {
    this.failures++;
    this.lastFailure = Date.now();

    logger.error("Circuit breaker failure", {
      failures: this.failures,
      threshold: this.failureThreshold,
      state: this.state,
      error: error.message,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      logger.info("Circuit breaker transitioning to OPEN (failed in HALF_OPEN)");
      this.state = CircuitState.OPEN;
      this.scheduleReset();
    } else if (this.failures >= this.failureThreshold) {
      logger.info("Circuit breaker transitioning to OPEN (threshold exceeded)");
      this.state = CircuitState.OPEN;
      this.scheduleReset();
    }
  }

  /**
   * Schedule reset attempt
   */
  scheduleReset() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      logger.info("Circuit breaker reset timeout elapsed");
      this.resetTimer = null;
    }, this.resetTimeout);
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    logger.info("Circuit breaker manually reset");
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
}

/**
 * Exponential backoff utility
 */
export class ExponentialBackoff {
  /**
   * @param {object} options - Backoff options
   * @param {number} [options.initialDelay=1000] - Initial delay in ms
   * @param {number} [options.maxDelay=60000] - Maximum delay in ms
   * @param {number} [options.factor=2] - Backoff factor
   * @param {number} [options.jitter=0.1] - Jitter factor (0-1)
   */
  constructor(options = {}) {
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 60000;
    this.factor = options.factor || 2;
    this.jitter = options.jitter || 0.1;
    this.attempt = 0;
  }

  /**
   * Get next delay
   * @returns {number} Delay in ms
   */
  next() {
    const delay = Math.min(
      this.initialDelay * Math.pow(this.factor, this.attempt),
      this.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitterAmount = delay * this.jitter;
    const jitteredDelay = delay + (Math.random() * 2 - 1) * jitterAmount;

    this.attempt++;

    logger.debug("Backoff delay calculated", {
      attempt: this.attempt,
      delay: Math.round(jitteredDelay),
    });

    return Math.max(0, jitteredDelay);
  }

  /**
   * Reset backoff
   */
  reset() {
    this.attempt = 0;
  }

  /**
   * Sleep for next delay
   * @returns {Promise<void>}
   */
  async sleep() {
    const delay = this.next();
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Global rate limiter registry
 */
const rateLimiters = new Map();
const circuitBreakers = new Map();

/**
 * Get or create rate limiter for service
 * @param {string} service - Service name
 * @param {object} [options] - Rate limiter options
 * @returns {RateLimiter}
 */
export function getRateLimiter(service, options) {
  if (!rateLimiters.has(service)) {
    logger.info("Creating rate limiter", { service });
    rateLimiters.set(service, new RateLimiter(options));
  }
  return rateLimiters.get(service);
}

/**
 * Get or create circuit breaker for service
 * @param {string} service - Service name
 * @param {object} [options] - Circuit breaker options
 * @returns {CircuitBreaker}
 */
export function getCircuitBreaker(service, options) {
  if (!circuitBreakers.has(service)) {
    logger.info("Creating circuit breaker", { service });
    circuitBreakers.set(service, new CircuitBreaker(options));
  }
  return circuitBreakers.get(service);
}

/**
 * Cleanup all rate limiters and circuit breakers
 */
export function cleanup() {
  logger.info("Cleaning up rate limiters and circuit breakers");

  for (const limiter of rateLimiters.values()) {
    limiter.stop();
  }
  rateLimiters.clear();

  for (const breaker of circuitBreakers.values()) {
    breaker.reset();
  }
  circuitBreakers.clear();
}
