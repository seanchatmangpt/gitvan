import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const ACTUATING_TYPES = new Set(["cli", "http", "file"]);
const TEMPLATE_PATTERN = /{{|{%|\$\{|<%/;
const SHELL_META_PATTERN = /[;|&`$()<>\\{}\[\]\r\n]/;
const DEFAULT_INHERITED_ENV = ["PATH", "SystemRoot", "ComSpec", "PATHEXT", "TMP", "TEMP"];

export class ActuationPolicyRefusal extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ActuationPolicyRefusal";
    this.code = code;
    this.details = details;
  }
}

function envList(name) {
  return (process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function asSet(value, fallback = []) {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value.map(String));
  if (typeof value === "string") {
    return new Set(value.split(",").map((item) => item.trim()).filter(Boolean));
  }
  return new Set(fallback);
}

function commandRules(value) {
  if (!value) return [];
  let source = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        source = JSON.parse(trimmed);
      } catch {
        source = trimmed.split(";;");
      }
    } else {
      source = trimmed.split(";;");
    }
  }
  if (!Array.isArray(source)) source = [source];
  return source.map((rule) =>
    Array.isArray(rule)
      ? rule.map(String)
      : String(rule).trim().split(/\s+/).filter(Boolean)
  ).filter((rule) => rule.length > 0);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function digest(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`;
}

export function createReceipt(kind, payload, parentDigest = null) {
  const unsigned = {
    version: "gitvan.enterprise.receipt.v1",
    kind,
    parentDigest,
    createdAt: new Date().toISOString(),
    payload: canonicalize(payload),
  };
  return { ...unsigned, digest: digest(unsigned) };
}

export function verifyReceipt(receipt) {
  if (!receipt || typeof receipt !== "object" || typeof receipt.digest !== "string") {
    return false;
  }
  const { digest: claimed, ...unsigned } = receipt;
  const actual = digest(unsigned);
  const a = Buffer.from(claimed);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizePolicy(input = {}) {
  const enabled = input.enabled ?? process.env.GITVAN_ENTERPRISE_MODE === "1";
  const rootDir = resolve(input.rootDir || process.env.GITVAN_REPO || process.cwd());
  const actor = input.actor || process.env.GITVAN_ACTOR || null;
  const tenant = input.tenant || process.env.GITVAN_TENANT || null;
  const receiptDir = resolve(
    input.receiptDir || process.env.GITVAN_ENTERPRISE_RECEIPT_DIR || join(rootDir, ".gitvan", "receipts", "enterprise")
  );

  return {
    enabled,
    rootDir,
    receiptDir,
    actor,
    tenant,
    cli: {
      allowedCommands: commandRules(
        input.cli?.allowedCommands ??
          process.env.GITVAN_ALLOWED_COMMANDS_JSON ??
          process.env.GITVAN_ALLOWED_COMMANDS
      ),
      allowedEnv: asSet(input.cli?.allowedEnv, envList("GITVAN_ALLOWED_ENV")),
      inheritedEnv: asSet(
        input.cli?.inheritedEnv,
        DEFAULT_INHERITED_ENV
      ),
    },
    http: {
      allowedHosts: asSet(
        input.http?.allowedHosts,
        envList("GITVAN_ALLOWED_HTTP_HOSTS")
      ),
      allowedMethods: asSet(
        input.http?.allowedMethods,
        envList("GITVAN_ALLOWED_HTTP_METHODS").length
          ? envList("GITVAN_ALLOWED_HTTP_METHODS").map((method) => method.toUpperCase())
          : ["GET", "HEAD"]
      ),
      allowHttp: input.http?.allowHttp ?? process.env.GITVAN_ALLOW_HTTP === "1",
    },
    file: {
      allowedOperations: asSet(
        input.file?.allowedOperations,
        envList("GITVAN_ALLOWED_FILE_OPERATIONS").length
          ? envList("GITVAN_ALLOWED_FILE_OPERATIONS")
          : ["read"]
      ),
    },
  };
}

function refuse(code, message, details) {
  throw new ActuationPolicyRefusal(code, message, details);
}

function hasTemplate(value) {
  if (typeof value === "string") return TEMPLATE_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(hasTemplate);
  return false;
}

function realBoundary(pathValue, rootDir) {
  const lexicalRoot = resolve(rootDir);
  const lexicalCandidate = isAbsolute(pathValue)
    ? resolve(pathValue)
    : resolve(lexicalRoot, pathValue);
  const rel = relative(lexicalRoot, lexicalCandidate);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    refuse("FILESYSTEM_BOUNDARY_REFUSED", "Path escapes enterprise root", {
      path: pathValue,
      rootDir: lexicalRoot,
    });
  }

  const realRoot = existsSync(lexicalRoot) ? realpathSync(lexicalRoot) : lexicalRoot;
  let probe = lexicalCandidate;
  while (!existsSync(probe) && probe !== dirname(probe)) probe = dirname(probe);
  if (existsSync(probe)) {
    const realProbe = realpathSync(probe);
    const realRel = relative(realRoot, realProbe);
    if (realRel === ".." || realRel.startsWith(`..${sep}`) || isAbsolute(realRel)) {
      refuse("FILESYSTEM_SYMLINK_REFUSED", "Resolved path escapes enterprise root", {
        path: pathValue,
        rootDir: realRoot,
      });
    }
  }
  return lexicalCandidate;
}

function persistReceipt(receipt, policy) {
  if (!policy.enabled) return null;
  const receiptDir = realBoundary(policy.receiptDir, policy.rootDir);
  mkdirSync(receiptDir, { recursive: true, mode: 0o700 });
  const filePath = join(receiptDir, `${receipt.digest.slice("sha256:".length)}.json`);
  const content = `${JSON.stringify(receipt, null, 2)}\n`;
  try {
    writeFileSync(filePath, content, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = JSON.parse(readFileSync(filePath, "utf8"));
    if (!verifyReceipt(existing) || existing.digest !== receipt.digest) {
      refuse("RECEIPT_COLLISION_REFUSED", "Existing receipt does not match digest", {
        digest: receipt.digest,
      });
    }
  }
  return filePath;
}

function commandVector(command) {
  const parts = Array.isArray(command)
    ? command.map(String)
    : String(command || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) refuse("CLI_COMMAND_REFUSED", "CLI command is empty");
  if (parts.some((part) => hasTemplate(part))) {
    refuse("DYNAMIC_ACTUATION_REFUSED", "Enterprise mode forbids templated CLI targets/arguments");
  }
  if (parts.some((part) => SHELL_META_PATTERN.test(part))) {
    refuse("CLI_METACHAR_REFUSED", "Enterprise mode forbids shell metacharacters in CLI commands");
  }
  return parts;
}

function safeEnvironment(policy, explicitEnv = {}) {
  const allowedExplicit = policy.cli.allowedEnv;
  const explicitKeys = Object.keys(explicitEnv || {});
  for (const key of explicitKeys) {
    if (!allowedExplicit.has(key)) {
      refuse("ENV_AUTHORITY_REFUSED", `Environment key is not admitted: ${key}`, { key });
    }
  }

  const result = {};
  for (const key of policy.cli.inheritedEnv) {
    if (process.env[key] !== undefined) result[key] = process.env[key];
  }
  for (const key of explicitKeys) result[key] = String(explicitEnv[key]);
  return result;
}

function summarize(step) {
  const config = step?.config || {};
  if (step?.type === "cli") {
    const vector = Array.isArray(config.command)
      ? config.command.map(String)
      : String(config.command || "").trim().split(/\s+/).filter(Boolean);
    return {
      id: step.id || null,
      type: "cli",
      executable: vector[0] || null,
      argumentCount: Math.max(0, vector.length - 1),
      argumentsDigest: digest(vector.slice(1)),
      cwd: config.cwd || null,
      envKeys: Object.keys(config.env || {}).sort(),
    };
  }
  if (step?.type === "http") {
    let safeUrl = String(config.url || "");
    try {
      const parsed = new URL(safeUrl);
      parsed.username = "";
      parsed.password = "";
      parsed.search = "";
      parsed.hash = "";
      safeUrl = parsed.toString();
    } catch {}
    return {
      id: step.id || null,
      type: "http",
      method: String(config.method || "GET").toUpperCase(),
      url: safeUrl,
      headerNames: Object.keys(config.headers || {}).sort(),
      bodyDigest: config.body === undefined ? null : digest(config.body),
    };
  }
  if (step?.type === "file") {
    return {
      id: step.id || null,
      type: "file",
      operation: config.operation || null,
      filePath: config.filePath || null,
      sourcePath: config.sourcePath || null,
      targetPath: config.targetPath || null,
      contentDigest: config.content === undefined ? null : digest(config.content),
    };
  }
  return { id: step?.id || null, type: step?.type || "unknown" };
}

function admitStrict(step, policy) {
  if (!policy.actor || !policy.tenant) {
    refuse("IDENTITY_AUTHORITY_REFUSED", "Enterprise actuation requires GITVAN_ACTOR and GITVAN_TENANT");
  }

  const config = { ...(step.config || {}) };

  if (step.type === "cli") {
    const vector = commandVector(config.command);
    const executable = vector[0];
    if (!isAbsolute(executable)) {
      refuse(
        "CLI_EXECUTABLE_PATH_REFUSED",
        "Enterprise mode requires an absolute executable path",
        { executable }
      );
    }
    const admitted = policy.cli.allowedCommands.some(
      (rule) => rule.length === vector.length && rule.every((part, index) => part === vector[index])
    );
    if (!admitted) {
      refuse("CLI_AUTHORITY_REFUSED", "CLI command vector is not admitted", {
        executable,
        argumentCount: Math.max(0, vector.length - 1),
      });
    }
    config.command = vector;
    config.cwd = realBoundary(config.cwd || policy.rootDir, policy.rootDir);
    const environment = safeEnvironment(policy, config.env || {});
    return {
      step: { ...step, config },
      runtime: { environment },
      target: { executable, cwd: config.cwd },
    };
  }

  if (step.type === "http") {
    if (hasTemplate(config.url)) {
      refuse("DYNAMIC_ACTUATION_REFUSED", "Enterprise mode forbids templated HTTP destinations");
    }
    let url;
    try {
      url = new URL(config.url);
    } catch {
      refuse("HTTP_DESTINATION_REFUSED", "HTTP URL is invalid", { url: config.url });
    }
    if (url.username || url.password) {
      refuse("HTTP_CREDENTIAL_URL_REFUSED", "Credentials in HTTP URLs are not admitted");
    }
    if (url.protocol !== "https:" && !(policy.http.allowHttp && url.protocol === "http:")) {
      refuse("HTTP_SCHEME_REFUSED", `HTTP scheme is not admitted: ${url.protocol}`);
    }
    if (policy.http.allowedHosts.size === 0 || !policy.http.allowedHosts.has(url.hostname)) {
      refuse("HTTP_HOST_REFUSED", `HTTP host is not admitted: ${url.hostname}`, { host: url.hostname });
    }
    const method = String(config.method || "GET").toUpperCase();
    if (!policy.http.allowedMethods.has(method)) {
      refuse("HTTP_METHOD_REFUSED", `HTTP method is not admitted: ${method}`, { method });
    }
    url.hash = "";
    config.url = url.toString();
    config.method = method;
    return {
      step: { ...step, config },
      runtime: {},
      target: { host: url.hostname, method },
    };
  }

  if (step.type === "file") {
    const operation = String(config.operation || "");
    if (!policy.file.allowedOperations.has(operation)) {
      refuse("FILE_OPERATION_REFUSED", `File operation is not admitted: ${operation}`, { operation });
    }
    for (const key of ["filePath", "sourcePath", "targetPath"]) {
      if (config[key] !== undefined) {
        if (hasTemplate(config[key])) {
          refuse("DYNAMIC_ACTUATION_REFUSED", `Enterprise mode forbids templated filesystem paths: ${key}`);
        }
        config[key] = realBoundary(config[key], policy.rootDir);
      }
    }
    return {
      step: { ...step, config },
      runtime: {},
      target: { operation },
    };
  }

  return { step, runtime: {}, target: { type: step.type } };
}

export function createActuationBroker(step, policyInput = {}) {
  const policy = normalizePolicy(policyInput);
  const receipts = [];
  let admission = null;

  return {
    policy: {
      enabled: policy.enabled,
      rootDir: policy.rootDir,
      receiptDir: policy.receiptDir,
      actor: policy.actor,
      tenant: policy.tenant,
    },

    admit() {
      if (admission) return admission;
      try {
        const result = policy.enabled && ACTUATING_TYPES.has(step.type)
          ? admitStrict(step, policy)
          : { step, runtime: {}, target: { type: step.type } };
        const receipt = createReceipt("admission", {
          standing: "ADMITTED",
          mode: policy.enabled ? "enterprise" : "legacy",
          actor: policy.actor,
          tenant: policy.tenant,
          subject: summarize(result.step),
          target: result.target,
        });
        const receiptPath = persistReceipt(receipt, policy);
        receipts.push(receipt);
        admission = { admitted: true, ...result, receipt, receiptPath };
        return admission;
      } catch (error) {
        if (!(error instanceof ActuationPolicyRefusal)) throw error;
        const receipt = createReceipt("admission", {
          standing: "REFUSED",
          mode: policy.enabled ? "enterprise" : "legacy",
          actor: policy.actor,
          tenant: policy.tenant,
          subject: summarize(step),
          refusal: { code: error.code, message: error.message, details: error.details },
        });
        const receiptPath = persistReceipt(receipt, policy);
        receipts.push(receipt);
        admission = { admitted: false, error, receipt, receiptPath, step, runtime: {} };
        return admission;
      }
    },

    complete(outcome = {}) {
      const parent = receipts.at(-1)?.digest || null;
      const receipt = createReceipt("execution", {
        standing: outcome.success === false ? "FAILED" : "EXECUTED",
        actor: policy.actor,
        tenant: policy.tenant,
        subject: summarize(admission?.step || step),
        consequence: {
          success: outcome.success !== false,
          error: outcome.error || null,
          exitCode: outcome.exitCode ?? null,
          duration: outcome.duration ?? null,
        },
      }, parent);
      persistReceipt(receipt, policy);
      receipts.push(receipt);
      return receipt;
    },

    receipts() {
      return [...receipts];
    },
  };
}
