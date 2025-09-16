// playground/utils/error-handler.mjs
export class GitVanError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = "GitVanError";
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export class GitOperationError extends GitVanError {
  constructor(message, gitCommand, context = {}) {
    super(message, "GIT_OPERATION_ERROR", { gitCommand, ...context });
    this.name = "GitOperationError";
  }
}

export class FileSystemError extends GitVanError {
  constructor(message, filePath, context = {}) {
    super(message, "FILE_SYSTEM_ERROR", { filePath, ...context });
    this.name = "FileSystemError";
  }
}

export class ValidationError extends GitVanError {
  constructor(message, field, value, context = {}) {
    super(message, "VALIDATION_ERROR", { field, value, ...context });
    this.name = "ValidationError";
  }
}

export class ExternalServiceError extends GitVanError {
  constructor(message, service, context = {}) {
    super(message, "EXTERNAL_SERVICE_ERROR", { service, ...context });
    this.name = "ExternalServiceError";
  }
}

export function createErrorHandler(ctx) {
  return {
    handleGitError(error, command) {
      ctx.logger.error(`Git operation failed: ${command}`, error.message);
      throw new GitOperationError(error.message, command, {
        originalError: error,
        stderr: error.stderr,
        stdout: error.stdout,
      });
    },

    handleFileSystemError(error, filePath) {
      ctx.logger.error(
        `File system operation failed: ${filePath}`,
        error.message,
      );
      throw new FileSystemError(error.message, filePath, {
        originalError: error,
        code: error.code,
      });
    },

    handleValidationError(message, field, value) {
      ctx.logger.error(`Validation failed: ${field}`, message);
      throw new ValidationError(message, field, value);
    },

    handleExternalServiceError(error, service) {
      ctx.logger.error(`External service failed: ${service}`, error.message);
      throw new ExternalServiceError(error.message, service, {
        originalError: error,
        statusCode: error.statusCode,
        response: error.response,
      });
    },
  };
}
