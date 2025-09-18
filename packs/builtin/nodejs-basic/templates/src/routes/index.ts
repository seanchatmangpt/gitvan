{% if use_typescript %}import { Router, Request, Response } from 'express';

const router = Router();

// Welcome endpoint
router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to {{ project_name }}! 🚀',
    description: 'A Node.js API created with GitVan',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api'
    },
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
router.get('/api', (req: Request, res: Response) => {
  res.json({
    name: '{{ project_name }} API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

export default router;{% else %}const { Router } = require('express');

const router = Router();

// Welcome endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to {{ project_name }}! 🚀',
    description: 'A Node.js API created with GitVan',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api'
    },
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
router.get('/api', (req, res) => {
  res.json({
    name: '{{ project_name }} API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;{% endif %}