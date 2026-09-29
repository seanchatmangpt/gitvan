import { EXACT_COMMIT } from "../conformance/identity.mjs";
import { SwarmGatewayError } from "./errors.mjs";

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function assertExactCommitSyntax(commit) {
  if (!EXACT_COMMIT.test(commit || "")) {
    throw new SwarmGatewayError(
      "exact_commit_required",
      "Swarm receipt gateway requires an explicit lowercase 40-hex commit SHA",
      { details: { commit } },
    );
  }
  return commit;
}

export function normalizeRepositoryRemote(remote) {
  const value = String(remote || "").trim();
  const ssh = value.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i);
  if (ssh) return ssh[1];

  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== "github.com") return null;
    return url.pathname.replace(/^\//, "").replace(/\.git$/, "");
  } catch {
    return null;
  }
}

export function assertRepository(repository) {
  if (!REPOSITORY.test(repository || "")) {
    throw new SwarmGatewayError(
      "repository_identity_required",
      "Repository identity must be explicit owner/name",
      { details: { repository } },
    );
  }
  return repository;
}

export async function resolveExactSubject(git, commit, requestedRepository) {
  assertExactCommitSyntax(commit);

  const resolved = String(
    await git.run(["rev-parse", "--verify", commit + "^{commit}"]),
  ).trim();

  if (resolved !== commit) {
    throw new SwarmGatewayError(
      "commit_identity_mismatch",
      "Git resolved a different commit than the admitted exact subject",
      { details: { commit, resolved } },
    );
  }

  const remote = String(
    await git.run(["config", "--get", "remote.origin.url"]),
  ).trim();
  const repository = normalizeRepositoryRemote(remote);

  if (!repository) {
    throw new SwarmGatewayError(
      "repository_identity_unresolved",
      "Cannot derive canonical GitHub owner/name from remote.origin.url",
      { details: { remote } },
    );
  }

  if (requestedRepository && assertRepository(requestedRepository) !== repository) {
    throw new SwarmGatewayError(
      "repository_identity_mismatch",
      "Requested repository does not match the authorized repository",
      { details: { requestedRepository, repository } },
    );
  }

  return Object.freeze({
    repository,
    commit,
    subject: repository + "@" + commit,
  });
}
