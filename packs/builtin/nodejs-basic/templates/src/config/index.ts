{% if use_typescript %}import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  corsOrigin: string | string[];
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '{{ port }}', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

// Validate required environment variables
const requiredEnvVars: (keyof Config)[] = [];

for (const envVar of requiredEnvVars) {
  if (!config[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;{% else %}const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '{{ port }}', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

// Validate required environment variables
const requiredEnvVars = [];

for (const envVar of requiredEnvVars) {
  if (!config[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = { config };{% endif %}