// src/composables/git/blame.mjs
// GitVan v2 — Blame and history tracking operations factory
// - Track line-by-line authorship
// - File history analysis
// - Author contributions
// - Code ownership tracking

/**
 * Create blame and history tracking operations
 *
 * @param {Object} base - Base configuration {cwd, env}
 * @param {Function} run - Execute git command with output
 * @param {Function} runVoid - Execute git command without output
 * @param {Function} toArr - Convert to array helper
 * @returns {Object} Blame operations interface
 */
export default function makeBlame(base, run, runVoid, toArr) {
  return {
    /**
     * Get line-by-line blame information for a file
     *
     * @param {string} file - File path to blame
     * @param {Object} [options={}] - Blame options
     * @param {string} [options.rev="HEAD"] - Revision to blame
     * @param {number} [options.startLine] - Start line number
     * @param {number} [options.endLine] - End line number
     * @param {boolean} [options.ignoreWhitespace=false] - Ignore whitespace changes
     * @param {boolean} [options.detectMoved=false] - Detect moved lines
     * @param {boolean} [options.detectCopied=false] - Detect copied lines
     * @returns {Promise<string>} Blame output
     *
     * @example
     * const blame = await blame('src/index.js');
     *
     * // Blame specific lines
     * const blame = await blame('src/index.js', {
     *   startLine: 10,
     *   endLine: 20
     * });
     *
     * // Detect moved/copied lines
     * const blame = await blame('src/index.js', {
     *   detectMoved: true,
     *   detectCopied: true
     * });
     */
    async blame(file, options = {}) {
      const args = ["blame"];

      if (options.ignoreWhitespace) {
        args.push("-w");
      }

      if (options.detectMoved) {
        args.push("-M");
      }

      if (options.detectCopied) {
        args.push("-C");
      }

      if (options.startLine && options.endLine) {
        args.push("-L", `${options.startLine},${options.endLine}`);
      } else if (options.startLine) {
        args.push("-L", `${options.startLine},+1`);
      }

      const rev = options.rev || "HEAD";
      args.push(rev);
      args.push("--", file);

      return run(args);
    },

    /**
     * Get parsed blame data as structured objects
     *
     * @param {string} file - File path to blame
     * @param {Object} [options={}] - Blame options
     * @returns {Promise<Array>} Array of blame entries
     *
     * @example
     * const data = await getBlameData('src/index.js');
     * // Returns: [
     * //   { line: 1, hash: 'abc123', author: 'John', date: '...', content: '...' },
     * //   ...
     * // ]
     */
    async getBlameData(file, options = {}) {
      const args = ["blame", "--porcelain"];

      if (options.ignoreWhitespace) args.push("-w");
      if (options.detectMoved) args.push("-M");
      if (options.detectCopied) args.push("-C");

      const rev = options.rev || "HEAD";
      args.push(rev);
      args.push("--", file);

      const output = await run(args);

      // Parse porcelain format
      const lines = output.split("\n");
      const result = [];
      let current = {};

      for (const line of lines) {
        if (/^[a-f0-9]{40}/.test(line)) {
          // New commit line
          if (current.hash) {
            result.push({ ...current });
          }
          const parts = line.split(" ");
          current = {
            hash: parts[0],
            originalLine: parseInt(parts[1], 10),
            finalLine: parseInt(parts[2], 10),
          };
        } else if (line.startsWith("author ")) {
          current.author = line.substring(7);
        } else if (line.startsWith("author-time ")) {
          current.timestamp = parseInt(line.substring(12), 10);
          current.date = new Date(current.timestamp * 1000).toISOString();
        } else if (line.startsWith("summary ")) {
          current.summary = line.substring(8);
        } else if (line.startsWith("\t")) {
          current.content = line.substring(1);
        }
      }

      if (current.hash) {
        result.push(current);
      }

      return result;
    },

    /**
     * Get complete commit history for a file
     *
     * @param {string} file - File path
     * @param {Object} [options={}] - History options
     * @param {number} [options.limit] - Limit number of commits
     * @param {string} [options.since] - Start date
     * @param {string} [options.until] - End date
     * @param {boolean} [options.follow=true] - Follow file renames
     * @returns {Promise<Array>} Array of commits affecting the file
     *
     * @example
     * const history = await getCommitHistory('src/index.js');
     * // Returns: [{ hash: '...', author: '...', date: '...', message: '...' }, ...]
     *
     * // With date range
     * const history = await getCommitHistory('src/index.js', {
     *   since: '2024-01-01',
     *   until: '2024-12-31'
     * });
     */
    async getCommitHistory(file, options = {}) {
      const args = ["log", "--format=%H%x09%an%x09%ai%x09%s"];

      if (options.follow !== false) {
        args.push("--follow");
      }

      if (options.limit) {
        args.push(`-${options.limit}`);
      }

      if (options.since) {
        args.push(`--since=${options.since}`);
      }

      if (options.until) {
        args.push(`--until=${options.until}`);
      }

      args.push("--", file);

      const output = await run(args);

      return output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [hash, author, date, message] = line.split("\t");
          return { hash, author, date, message };
        });
    },

    /**
     * Get list of authors who modified a file
     *
     * @param {string} file - File path
     * @param {Object} [options={}] - Author options
     * @param {boolean} [options.withStats=false] - Include contribution stats
     * @returns {Promise<Array>} Array of authors
     *
     * @example
     * const authors = await getAuthorsOfFile('src/index.js');
     * // Returns: ['John Doe', 'Jane Smith', ...]
     *
     * // With statistics
     * const authors = await getAuthorsOfFile('src/index.js', { withStats: true });
     * // Returns: [
     * //   { name: 'John Doe', commits: 15, lines: 234 },
     * //   ...
     * // ]
     */
    async getAuthorsOfFile(file, options = {}) {
      if (options.withStats) {
        const output = await run([
          "log",
          "--format=%an",
          "--numstat",
          "--follow",
          "--",
          file,
        ]);

        const authorStats = {};
        let currentAuthor = null;

        for (const line of output.split("\n")) {
          if (line && !line.includes("\t")) {
            currentAuthor = line.trim();
            if (!authorStats[currentAuthor]) {
              authorStats[currentAuthor] = { commits: 0, additions: 0, deletions: 0 };
            }
            authorStats[currentAuthor].commits++;
          } else if (line.includes("\t") && currentAuthor) {
            const [additions, deletions] = line.split("\t");
            if (additions !== "-" && deletions !== "-") {
              authorStats[currentAuthor].additions += parseInt(additions, 10) || 0;
              authorStats[currentAuthor].deletions += parseInt(deletions, 10) || 0;
            }
          }
        }

        return Object.entries(authorStats).map(([name, stats]) => ({
          name,
          commits: stats.commits,
          additions: stats.additions,
          deletions: stats.deletions,
          totalLines: stats.additions + stats.deletions,
        }));
      } else {
        const output = await run(["log", "--format=%an", "--follow", "--", file]);

        const authors = new Set(
          output
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        );

        return Array.from(authors);
      }
    },

    /**
     * Get all files modified by a specific author
     *
     * @param {string} author - Author name or email
     * @param {Object} [options={}] - Query options
     * @param {string} [options.since] - Start date
     * @param {string} [options.until] - End date
     * @returns {Promise<Array>} Array of file paths
     *
     * @example
     * const files = await getFilesByAuthor('john@example.com');
     * // Returns: ['src/index.js', 'src/utils.js', ...]
     */
    async getFilesByAuthor(author, options = {}) {
      const args = ["log", "--author", author, "--name-only", "--format="];

      if (options.since) {
        args.push(`--since=${options.since}`);
      }

      if (options.until) {
        args.push(`--until=${options.until}`);
      }

      const output = await run(args);

      const files = new Set(
        output
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      );

      return Array.from(files);
    },

    /**
     * Get file ownership statistics
     *
     * @param {string} file - File path
     * @returns {Promise<Object>} Ownership statistics
     *
     * @example
     * const ownership = await getFileOwnership('src/index.js');
     * // Returns: {
     * //   primaryOwner: { name: 'John Doe', percentage: 65 },
     * //   contributors: [
     * //     { name: 'John Doe', lines: 150, percentage: 65 },
     * //     { name: 'Jane Smith', lines: 80, percentage: 35 }
     * //   ]
     * // }
     */
    async getFileOwnership(file) {
      const blameData = await this.getBlameData(file);

      const authorLines = {};
      for (const entry of blameData) {
        if (!authorLines[entry.author]) {
          authorLines[entry.author] = 0;
        }
        authorLines[entry.author]++;
      }

      const totalLines = blameData.length;
      const contributors = Object.entries(authorLines)
        .map(([name, lines]) => ({
          name,
          lines,
          percentage: Math.round((lines / totalLines) * 100),
        }))
        .sort((a, b) => b.lines - a.lines);

      return {
        primaryOwner: contributors[0] || null,
        contributors,
        totalLines,
      };
    },

    /**
     * Track when lines were last modified
     *
     * @param {string} file - File path
     * @param {number} lineNumber - Line number to track
     * @returns {Promise<Object>} Line modification history
     *
     * @example
     * const history = await trackLineHistory('src/index.js', 42);
     * // Returns: {
     * //   currentCommit: 'abc123',
     * //   author: 'John Doe',
     * //   date: '2024-01-15',
     * //   message: 'fix: update function'
     * // }
     */
    async trackLineHistory(file, lineNumber) {
      const blameData = await this.getBlameData(file);
      const lineData = blameData.find((entry) => entry.finalLine === lineNumber);

      if (!lineData) {
        return null;
      }

      return {
        currentCommit: lineData.hash,
        author: lineData.author,
        date: lineData.date,
        message: lineData.summary,
        content: lineData.content,
      };
    },
  };
}
