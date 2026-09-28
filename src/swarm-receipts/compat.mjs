import {migrateLegacy} from './migration.mjs';import {SCHEMA} from './constants.mjs';export function normalizeReceipt(value,subject){return value?.schema===SCHEMA?value:migrateLegacy(value,subject);}
