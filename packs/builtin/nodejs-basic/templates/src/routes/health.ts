{% if use_typescript %}import { Router, Request, Response } from 'express';

const router = Router();

// Health check endpoint
router.get('/', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'OK',
    service: '{{ project_name }}',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      unit: 'MB'
    },
    version: '1.0.0'
  };

  res.status(200).json(healthCheck);
});

// Detailed health check
router.get('/detailed', (req: Request, res: Response) => {
  const detailed = {
    status: 'OK',
    service: '{{ project_name }}',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    version: '1.0.0'
  };

  res.status(200).json(detailed);
});

export default router;{% else %}const { Router } = require('express');

const router = Router();

// Health check endpoint
router.get('/', (req, res) => {
  const healthCheck = {
    status: 'OK',
    service: '{{ project_name }}',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      unit: 'MB'
    },
    version: '1.0.0'
  };

  res.status(200).json(healthCheck);
});

// Detailed health check
router.get('/detailed', (req, res) => {
  const detailed = {
    status: 'OK',
    service: '{{ project_name }}',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    version: '1.0.0'
  };

  res.status(200).json(detailed);
});

module.exports = router;{% endif %}