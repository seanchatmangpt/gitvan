// GitVan v3.0.0 - Pack Registry Manager
// High-level pack registry management functionality

import { createLogger } from "../utils/logger.mjs";
import { sha256Hex, fingerprint } from "../utils/crypto.mjs";
import { join, resolve, dirname } from "pathe";
import {
import { homedir } from "node:os";
import { z } from "zod";
import { execSync } from "node:child_process";
import { exec } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { PackCache } from "./optimization/cache.mjs";
import Fuse from "fuse.js";
import { PackRegistry } from "./pack-registry.mjs";
import { PackCache } from "./pack-cache.mjs";
import { PackInfoSchema, SearchFiltersSchema } from "./schemas.mjs";


export { PackRegistryManager };