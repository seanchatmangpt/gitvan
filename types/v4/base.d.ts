/**
 * @fileoverview GitVan v4 - Base Type Definitions with @unrdf/hooks Integration
 *
 * This module provides foundational types for GitVan's hook-based reactive system.
 * It implements branded types, const assertions, and nominal typing patterns
 * following @unrdf/hooks conventions for strict type safety.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/// <reference types="node" />

// ============================================================================
// Branded Types (Nominal Typing)
// ============================================================================

/**
 * Brand interface for creating nominal types
 * Prevents accidental assignment between structurally similar types
 *
 * @template T - The brand identifier
 */
declare const __brand: unique symbol;

/**
 * Branded type utility - creates nominal types from structural types
 *
 * @template T - Base type
 * @template Brand - Brand identifier string
 *
 * @example
 * type UserId = Branded<string, 'UserId'>;
 * type SessionId = Branded<string, 'SessionId'>;
 * // UserId and SessionId are incompatible despite both being strings
 */
export type Branded<T, Brand extends string> = T & { readonly [__brand]: Brand };

/**
 * Hook identifier - uniquely identifies a hook definition
 */
export type HookId = Branded<string, 'HookId'>;

/**
 * Workflow identifier - uniquely identifies a workflow
 */
export type WorkflowId = Branded<string, 'WorkflowId'>;

/**
 * Step identifier - uniquely identifies a workflow step
 */
export type StepId = Branded<string, 'StepId'>;

/**
 * Execution identifier - uniquely identifies a hook execution
 */
export type ExecutionId = Branded<string, 'ExecutionId'>;

/**
 * Session identifier - groups related operations
 */
export type SessionId = Branded<string, 'SessionId'>;

/**
 * Lock identifier - uniquely identifies a lock
 */
export type LockId = Branded<string, 'LockId'>;

/**
 * Receipt identifier - uniquely identifies a receipt
 */
export type ReceiptId = Branded<string, 'ReceiptId'>;

/**
 * Git commit SHA - 40-character hexadecimal string
 */
export type CommitSha = Branded<string, 'CommitSha'>;

/**
 * Git reference name - refs/heads/*, refs/tags/*, etc.
 */
export type RefName = Branded<string, 'RefName'>;

// ============================================================================
// Const Assertion Types
// ============================================================================

/**
 * Deep readonly utility - makes all nested properties readonly
 *
 * @template T - Object type to make deeply readonly
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? DeepReadonlyArray<U>
  : T extends object
    ? DeepReadonlyObject<T>
    : T;

type DeepReadonlyArray<T> = ReadonlyArray<DeepReadonly<T>>;

type DeepReadonlyObject<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};

/**
 * Deep partial utility - makes all nested properties optional
 *
 * @template T - Object type to make deeply partial
 */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartialArray<U>
  : T extends object
    ? DeepPartialObject<T>
    : T;

type DeepPartialArray<T> = Array<DeepPartial<T>>;

type DeepPartialObject<T> = {
  [K in keyof T]?: DeepPartial<T[K]>;
};

/**
 * Deep required utility - makes all nested properties required
 *
 * @template T - Object type to make deeply required
 */
export type DeepRequired<T> = T extends (infer U)[]
  ? DeepRequiredArray<U>
  : T extends object
    ? DeepRequiredObject<T>
    : T;

type DeepRequiredArray<T> = Array<DeepRequired<T>>;

type DeepRequiredObject<T> = {
  [K in keyof T]-?: DeepRequired<T[K]>;
};

/**
 * Freeze type - ensures immutability at type level
 * Used with const assertions for maximum type safety
 *
 * @template T - Type to freeze
 */
export type Freeze<T> = T extends readonly (infer U)[]
  ? readonly Freeze<U>[]
  : T extends object
    ? Readonly<{ [K in keyof T]: Freeze<T[K]> }>
    : T;

// ============================================================================
// Primitive Types with Const Assertions
// ============================================================================

/**
 * JSON-compatible types for serialization
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | readonly Json[]
  | { readonly [key: string]: Json };

/**
 * Mutable JSON type (for internal processing)
 */
export type MutableJson =
  | string
  | number
  | boolean
  | null
  | MutableJson[]
  | { [key: string]: MutableJson };

/**
 * Priority levels as const union
 */
export type Priority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Priority levels as const array for iteration
 */
export const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

/**
 * Execution type variants
 */
export type ExecType = 'cli' | 'js' | 'llm' | 'job' | 'tmpl' | 'sparql' | 'http';

/**
 * Execution types as const array
 */
export const EXEC_TYPES = ['cli', 'js', 'llm', 'job', 'tmpl', 'sparql', 'http'] as const;

/**
 * Log levels as const union
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Log levels as const array
 */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

/**
 * Step status as const union
 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Step statuses as const array
 */
export const STEP_STATUSES = ['pending', 'running', 'completed', 'failed', 'skipped'] as const;

/**
 * Job status as const union
 */
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Job statuses as const array
 */
export const JOB_STATUSES = ['queued', 'running', 'completed', 'failed', 'cancelled'] as const;

/**
 * Hook lifecycle phase
 */
export type HookPhase =
  | 'init'
  | 'mount'
  | 'update'
  | 'beforeDestroy'
  | 'destroy'
  | 'error';

/**
 * Hook lifecycle phases as const array
 */
export const HOOK_PHASES = [
  'init',
  'mount',
  'update',
  'beforeDestroy',
  'destroy',
  'error',
] as const;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract keys of type T that have values of type V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Pick only keys of type T that have values of type V
 */
export type PickByType<T, V> = Pick<T, KeysOfType<T, V>>;

/**
 * Omit keys of type T that have values of type V
 */
export type OmitByType<T, V> = Omit<T, KeysOfType<T, V>>;

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Merge two types, with second type overriding first
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Prettify type display in IDE
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Non-nullable keys of T
 */
export type NonNullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? never : undefined extends T[K] ? never : K;
}[keyof T];

/**
 * Nullable keys of T
 */
export type NullableKeys<T> = Exclude<keyof T, NonNullableKeys<T>>;

/**
 * Extract element type from array
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Awaited type - unwraps Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

/**
 * Maybe type - T or undefined
 */
export type Maybe<T> = T | undefined;

/**
 * Nullable type - T, null, or undefined
 */
export type Nullable<T> = T | null | undefined;

/**
 * NonEmpty array type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Function type with any signature
 */
export type AnyFunction = (...args: any[]) => any;

/**
 * Async function type with any signature
 */
export type AsyncFunction = (...args: any[]) => Promise<any>;

/**
 * Ensure type is an object
 */
export type EnsureObject<T> = T extends object ? T : never;

// ============================================================================
// Result Types (Functional Error Handling)
// ============================================================================

/**
 * Success result variant
 */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
  readonly error?: never;
}

/**
 * Error result variant
 */
export interface Err<E = Error> {
  readonly ok: false;
  readonly value?: never;
  readonly error: E;
}

/**
 * Result type - discriminated union for success/failure
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Create success result
 */
export function ok<T>(value: T): Ok<T>;

/**
 * Create error result
 */
export function err<E = Error>(error: E): Err<E>;

/**
 * Check if result is success
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T>;

/**
 * Check if result is error
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E>;

// ============================================================================
// Option Types (Optional Values)
// ============================================================================

/**
 * Some variant - contains a value
 */
export interface Some<T> {
  readonly _tag: 'Some';
  readonly value: T;
}

/**
 * None variant - no value
 */
export interface None {
  readonly _tag: 'None';
}

/**
 * Option type - discriminated union for optional values
 */
export type Option<T> = Some<T> | None;

/**
 * Create Some option
 */
export function some<T>(value: T): Some<T>;

/**
 * Create None option
 */
export const none: None;

/**
 * Check if option is Some
 */
export function isSome<T>(option: Option<T>): option is Some<T>;

/**
 * Check if option is None
 */
export function isNone<T>(option: Option<T>): option is None;

// ============================================================================
// Timestamp Types
// ============================================================================

/**
 * Unix timestamp in milliseconds
 */
export type UnixTimestamp = Branded<number, 'UnixTimestamp'>;

/**
 * ISO 8601 date string
 */
export type ISODateString = Branded<string, 'ISODateString'>;

/**
 * Duration in milliseconds
 */
export type DurationMs = Branded<number, 'DurationMs'>;

// ============================================================================
// Namespace Constants
// ============================================================================

/**
 * RDF namespace prefixes as const object
 */
export const RDF_NAMESPACES = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  sh: 'http://www.w3.org/ns/shacl#',
  gv: 'https://gitvan.dev/ns/',
  hook: 'https://gitvan.dev/ns/hook/',
  workflow: 'https://gitvan.dev/ns/workflow/',
  step: 'https://gitvan.dev/ns/step/',
  pred: 'https://gitvan.dev/ns/predicate/',
} as const;

/**
 * RDF namespace type
 */
export type RdfNamespace = keyof typeof RDF_NAMESPACES;

/**
 * RDF namespace URI type
 */
export type RdfNamespaceUri = (typeof RDF_NAMESPACES)[RdfNamespace];

// ============================================================================
// Environment Types
// ============================================================================

/**
 * Deterministic environment configuration
 */
export interface DeterministicEnv {
  readonly TZ: 'UTC';
  readonly LANG: 'C';
  readonly LC_ALL?: 'C';
  readonly [key: string]: string | undefined;
}

/**
 * Git environment variables
 */
export interface GitEnv extends DeterministicEnv {
  readonly GIT_AUTHOR_NAME?: string;
  readonly GIT_AUTHOR_EMAIL?: string;
  readonly GIT_AUTHOR_DATE?: string;
  readonly GIT_COMMITTER_NAME?: string;
  readonly GIT_COMMITTER_EMAIL?: string;
  readonly GIT_COMMITTER_DATE?: string;
  readonly GIT_DIR?: string;
  readonly GIT_WORK_TREE?: string;
}

// ============================================================================
// Version Types
// ============================================================================

/**
 * Semantic version type
 */
export interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease?: readonly string[];
  readonly build?: readonly string[];
}

/**
 * GitVan version constant
 */
export const GITVAN_VERSION = {
  major: 4,
  minor: 0,
  patch: 0,
  prerelease: [] as readonly string[],
} as const satisfies SemVer;

/**
 * Schema version for type definitions
 */
export const SCHEMA_VERSION = '4.0' as const;

// ============================================================================
// Type Assertion Helpers
// ============================================================================

/**
 * Assert type at compile time
 */
export type Assert<T extends true> = T;

/**
 * Check if types are equal
 */
export type IsEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

/**
 * Check if T extends U
 */
export type Extends<T, U> = T extends U ? true : false;

/**
 * Check if T is never
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Check if T is any
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Ensure two types are exactly equal (compile-time assertion)
 */
export type Expect<T extends true> = T;

/**
 * ExpectTrue - assert type is true
 */
export type ExpectTrue<T extends true> = T;

/**
 * ExpectFalse - assert type is false
 */
export type ExpectFalse<T extends false> = T;
