export class SwarmGatewayError extends Error {
  constructor(code, message, { cause, subject, details } = {}) {
    super(message, { cause });
    this.name = "SwarmGatewayError";
    this.code = code;
    this.subject = subject;
    this.details = details;
  }
}

export function refuse(code, message, options = {}) {
  throw new SwarmGatewayError(code, message, options);
}
