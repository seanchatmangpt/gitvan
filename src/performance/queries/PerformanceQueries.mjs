/**
 * @fileoverview GitVan Performance Queries - Backwards Compatibility Wrapper
 *
 * This file maintains backwards compatibility by re-exporting the main index.
 * The implementation has been split across focused modules for better maintainability.
 *
 * For new code, import directly from the submodules:
 * - import { detectBudgetViolations } from './anomaly-detection.mjs'
 * - import { getTrendLine } from './trend-analysis.mjs'
 * - etc.
 *
 * @deprecated Import from './index.mjs' or specific modules instead
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { PerformanceQueries, default as PerformanceQueriesDefault } from './index.mjs';

export { PerformanceQueries };
export default PerformanceQueriesDefault;
