/**
 * @fileoverview AuditSerializer
 * Serializes audit data to N-Triples format for cryptographic integrity verification
 * Integrates with git notes for persistent storage
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import crypto from "crypto";
import { createLogger } from "./logger.mjs";

const logger = createLogger("utils:audit-serializer");

/**
 * Serializes audit data to N-Triples format with cryptographic signing
 * Supports git notes integration for persistent audit trails
 */
export class AuditSerializer {
  constructor(options = {}) {
    this.hashAlgorithm = options.hashAlgorithm || "sha256";
    this.enableSigning = options.enableSigning !== false;
    this.baseURI = options.baseURI || "https://gitvan.dev/audit/";
    this.logger = options.logger || logger;
    this.cache = new Map();
  }

  /**
   * Serializes audit data to N-Triples format
   * @param {Object} auditData - Audit data object
   * @returns {string} N-Triples representation
   */
  toNTriples(auditData) {
    try {
      const triples = [];
      const baseURI = this.baseURI;

      // Create audit record URI
      const auditId = auditData.id || this.generateId();
      const auditURI = `<${baseURI}${auditId}>`;

      // Audit metadata triples
      triples.push(
        `${auditURI} <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <${baseURI}AuditRecord> .`
      );

      // Job information
      if (auditData.jobId) {
        triples.push(
          `${auditURI} <${baseURI}jobId> "${this.escapeString(auditData.jobId)}" .`
        );
      }

      // Timestamp
      if (auditData.timestamp) {
        const ts = new Date(auditData.timestamp).toISOString();
        triples.push(
          `${auditURI} <${baseURI}timestamp> "${ts}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .`
        );
      }

      // Status
      if (auditData.status) {
        triples.push(
          `${auditURI} <${baseURI}status> "${this.escapeString(auditData.status)}" .`
        );
      }

      // Operator
      if (auditData.operator) {
        triples.push(
          `${auditURI} <${baseURI}operator> "${this.escapeString(auditData.operator)}" .`
        );
      }

      // Branch
      if (auditData.branch) {
        triples.push(
          `${auditURI} <${baseURI}branch> "${this.escapeString(auditData.branch)}" .`
        );
      }

      // Commit
      if (auditData.commit) {
        triples.push(
          `${auditURI} <${baseURI}commit> "${this.escapeString(auditData.commit)}" .`
        );
      }

      // Duration
      if (auditData.duration !== undefined && auditData.duration !== null) {
        triples.push(
          `${auditURI} <${baseURI}duration> "${auditData.duration}"^^<http://www.w3.org/2001/XMLSchema#integer> .`
        );
      }

      // Success flag
      if (auditData.success !== undefined) {
        triples.push(
          `${auditURI} <${baseURI}success> "${auditData.success ? "true" : "false"}"^^<http://www.w3.org/2001/XMLSchema#boolean> .`
        );
      }

      // Message/description
      if (auditData.message) {
        triples.push(
          `${auditURI} <${baseURI}message> "${this.escapeString(auditData.message)}" .`
        );
      }

      // Error details
      if (auditData.error) {
        triples.push(
          `${auditURI} <${baseURI}error> "${this.escapeString(auditData.error)}" .`
        );
      }

      // Metadata (if present)
      if (auditData.metadata && typeof auditData.metadata === "object") {
        const metadataStr = JSON.stringify(auditData.metadata);
        triples.push(
          `${auditURI} <${baseURI}metadata> "${this.escapeString(metadataStr)}" .`
        );
      }

      return triples.join("\n");
    } catch (error) {
      this.logger.error("N-Triples serialization failed:", error);
      throw error;
    }
  }

  /**
   * Serializes to N-Quads with named graphs
   * @param {Array<Object>} auditRecords - Array of audit records
   * @param {Object} options - Serialization options
   * @returns {string} N-Quads representation
   */
  toNQuads(auditRecords, options = {}) {
    try {
      if (!Array.isArray(auditRecords)) {
        auditRecords = [auditRecords];
      }

      const quads = [];
      const graphBase = options.graphBase || "https://gitvan.dev/audit/graphs/";

      for (let i = 0; i < auditRecords.length; i++) {
        const record = auditRecords[i];
        const graphId = record.id || this.generateId();
        const graphURI = `<${graphBase}${graphId}>`;

        // Convert to N-Triples and add graph URI
        const ntriples = this.toNTriples(record);
        const triples = ntriples.split("\n").filter((t) => t.trim());

        for (const triple of triples) {
          // Remove trailing period and add graph URI
          const tripleWithoutPeriod = triple.slice(0, -2);
          quads.push(`${tripleWithoutPeriod} ${graphURI} .`);
        }
      }

      return quads.join("\n");
    } catch (error) {
      this.logger.error("N-Quads serialization failed:", error);
      throw error;
    }
  }

  /**
   * Creates signed audit record
   * @param {Object} auditData - Audit data
   * @param {string} privateKey - Private key for signing (optional)
   * @returns {Object} Signed audit record
   */
  createSignedRecord(auditData, privateKey) {
    try {
      const ntriples = this.toNTriples(auditData);
      const canonical = this.canonicalize(ntriples);
      const hash = this.computeHash(canonical);

      const signature = privateKey
        ? this.sign(canonical, privateKey)
        : null;

      return {
        id: auditData.id || this.generateId(),
        audit: auditData,
        ntriples,
        canonical,
        hash,
        signature,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Signed record creation failed:", error);
      throw error;
    }
  }

  /**
   * Verifies signed audit record
   * @param {Object} signedRecord - Signed audit record
   * @param {string} publicKey - Public key for verification
   * @returns {Object} Verification result
   */
  verifySignedRecord(signedRecord, publicKey) {
    try {
      const { canonical, signature, hash } = signedRecord;

      // Verify hash
      const computedHash = this.computeHash(canonical);
      const hashValid = computedHash === hash;

      // Verify signature if present
      let signatureValid = true;
      if (signature && publicKey) {
        signatureValid = this.verify(canonical, signature, publicKey);
      }

      return {
        valid: hashValid && signatureValid,
        hashValid,
        signatureValid,
        recordId: signedRecord.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Record verification failed:", error);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Stores audit record in git notes
   * @param {Object} git - Git operations object (must have notes.add method)
   * @param {string} ref - Git reference (commit SHA)
   * @param {Object} auditData - Audit data
   * @returns {Promise<Object>} Storage result
   */
  async storeInGitNotes(git, ref, auditData) {
    try {
      const signedRecord = this.createSignedRecord(auditData);
      const noteMessage = JSON.stringify(signedRecord, null, 2);

      await git.notes.add({
        ref,
        message: noteMessage,
        append: true,
      });

      return {
        success: true,
        ref,
        auditId: signedRecord.id,
        hash: signedRecord.hash,
      };
    } catch (error) {
      this.logger.error("Git notes storage failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Retrieves audit records from git notes
   * @param {Object} git - Git operations object
   * @param {string} ref - Git reference
   * @returns {Promise<Array<Object>>} Audit records
   */
  async retrieveFromGitNotes(git, ref) {
    try {
      const notes = await git.notes.read(ref);

      if (!notes) {
        return [];
      }

      // Parse JSON audit records
      const records = [];

      // Handle both single and multiple records
      try {
        const parsed = JSON.parse(notes);
        records.push(parsed);
      } catch {
        // Try splitting by audit ID pattern
        const auditRecords = notes
          .split(/(?=\{[\s\n]*"id")/g)
          .filter((s) => s.trim());

        for (const record of auditRecords) {
          try {
            const parsed = JSON.parse(record);
            records.push(parsed);
          } catch (e) {
            this.logger.warn(`Failed to parse audit record: ${e.message}`);
          }
        }
      }

      return records;
    } catch (error) {
      this.logger.error("Git notes retrieval failed:", error);
      return [];
    }
  }

  /**
   * Exports audit records to file
   * @param {Array<Object>} records - Audit records
   * @param {string} format - Export format (ntriples, nquads, json)
   * @returns {string} Serialized data
   */
  exportRecords(records, format = "json") {
    try {
      if (!Array.isArray(records)) {
        records = [records];
      }

      switch (format.toLowerCase()) {
        case "ntriples":
          return records.map((r) => this.toNTriples(r)).join("\n\n");

        case "nquads":
          return this.toNQuads(records);

        case "json":
        default:
          return JSON.stringify(records, null, 2);
      }
    } catch (error) {
      this.logger.error(`Export to ${format} failed:`, error);
      throw error;
    }
  }

  /**
   * Canonicalizes N-Triples representation
   * @param {string} ntriples - N-Triples string
   * @returns {string} Canonical form
   */
  canonicalize(ntriples) {
    // Sort triples for deterministic output
    const triples = ntriples
      .split("\n")
      .filter((t) => t.trim())
      .sort();

    return triples.join("\n");
  }

  /**
   * Computes cryptographic hash
   * @param {string} data - Data to hash
   * @returns {string} Hex-encoded hash
   */
  computeHash(data) {
    return crypto
      .createHash(this.hashAlgorithm)
      .update(data)
      .digest("hex");
  }

  /**
   * Signs data with private key
   * @param {string} data - Data to sign
   * @param {string} privateKey - PEM-encoded private key
   * @returns {string} Signature
   */
  sign(data, privateKey) {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(data);
    return signer.sign(privateKey, "hex");
  }

  /**
   * Verifies signature with public key
   * @param {string} data - Original data
   * @param {string} signature - Signature
   * @param {string} publicKey - PEM-encoded public key
   * @returns {boolean} Verification result
   */
  verify(data, signature, publicKey) {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(data);
    return verifier.verify(publicKey, signature, "hex");
  }

  /**
   * Escapes special characters for RDF
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeString(str) {
    if (typeof str !== "string") {
      str = String(str);
    }

    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }

  /**
   * Generates unique audit ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Gets audit API for simplified usage
   * @returns {Object} Audit API object
   */
  getAPI() {
    return {
      serialize: (data) => this.toNTriples(data),
      serializeQuads: (records) => this.toNQuads(records),
      sign: (data, key) => this.createSignedRecord(data, key),
      verify: (record, key) => this.verifySignedRecord(record, key),
      hash: (data) => this.computeHash(data),
      export: (records, format) => this.exportRecords(records, format),
    };
  }
}

export default AuditSerializer;
