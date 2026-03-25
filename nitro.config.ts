// nitro.config.ts
// Nitro server configuration for GitVan daemon
// Handles H3 server setup, middleware, plugins, OTEL integration

import { defineNitroConfig } from 'nitropack';

export default defineNitroConfig({
  // Compatibility date
  compatibilityDate: '2026-01-10',

  // Server basics
  preset: 'node-server',
  srcDir: './server',
  output: {
    dir: '.output/server'
  },

  // HTTP configuration
  host: process.env.GITVAN_HOST || 'localhost',
  port: parseInt(process.env.GITVAN_PORT || '5173'),
  https: process.env.GITVAN_HTTPS === 'true' ? {} : false,

  // API routes
  routeRules: {
    '/api/**': { cache: false },
    '/health': { cache: { maxAge: 0 } },
  },

  // Middleware stack
  middleware: [
    'api-base',
  ],

  // Plugin loading
  plugins: [
    './plugins/config-plugin.mjs',
    './plugins/health-plugin.mjs',
    './plugins/hooks-plugin.mjs',
    './plugins/jobs-plugin.mjs',
    './plugins/pack-plugin.mjs',
    './plugins/rdf-plugin.mjs',
    './plugins/workflow-plugin.mjs',
  ],

  // Environment variables
  env: {
    GITVAN_HOME: process.env.GITVAN_HOME || process.env.HOME,
    GITVAN_REPO: process.env.GITVAN_REPO || process.cwd(),
    TZ: 'UTC',
    LANG: 'C',
    NODE_ENV: process.env.NODE_ENV || 'development',
    GITVAN_PORT: process.env.GITVAN_PORT || '5173',
  },

  // OpenTelemetry integration
  otel: {
    enabled: process.env.OTEL_ENABLED === 'true',
    exporter: 'otlp',
    endpoint: process.env.OTEL_ENDPOINT || 'http://localhost:4318',
  },

  // Logging configuration
  logging: {
    colorize: true,
  },

  // Development settings
  dev: process.env.NODE_ENV === 'development',

  // Build configuration
  build: {
    rollup: {
      emitAssets: true,
    },
  },

  // Watch files for HMR in dev
  watch: process.env.NODE_ENV === 'development' ? [
    'server/**',
    'src/**',
  ] : [],

  // WebSocket configuration
  websocket: {
    enabled: true,
  },
});
