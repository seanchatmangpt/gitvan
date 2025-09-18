/**
 * Mock Git implementation for testing
 * Provides fake Git operations without requiring actual Git repository
 */

export class MockGit {
  constructor(options = {}) {
    this.root = options.root || process.cwd();
    this.headCommit = options.headCommit || "mock-commit-123";
    this.nowISO = options.nowISO || new Date().toISOString();
  }

  async head() {
    return this.headCommit;
  }

  nowISO() {
    return this.nowISO;
  }

  now() {
    return this.nowISO;
  }

  async updateRefCreate(ref, sha) {
    // Mock implementation - always succeeds for testing
    return true;
  }

  async delRef(ref) {
    // Mock implementation - always succeeds for testing
    return true;
  }

  async noteAppend(ref, content) {
    // Mock implementation - always succeeds for testing
    return true;
  }

  async noteShow(ref, sha) {
    // Mock implementation - return empty for testing
    return "";
  }

  async run(command) {
    // Mock implementation - return empty for testing
    return "";
  }
}
