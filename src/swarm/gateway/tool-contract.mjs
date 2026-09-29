import { EXACT_COMMIT } from "../conformance/identity.mjs";
import { SwarmGatewayError } from "./errors.mjs";

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function admitGatewayToolInput(input = {}) {
  if (!REPOSITORY.test(input.repository || "")) {
    throw new SwarmGatewayError(
      "repository_identity_required",
      "Gateway tool requires explicit repository owner/name",
    );
  }
  if (!EXACT_COMMIT.test(input.commit || "")) {
    throw new SwarmGatewayError(
      "exact_commit_required",
      "Gateway tool requires explicit lowercase 40-hex commit SHA",
    );
  }
  return Object.freeze({
    repository: input.repository,
    commit: input.commit,
    ref: input.ref,
  });
}
