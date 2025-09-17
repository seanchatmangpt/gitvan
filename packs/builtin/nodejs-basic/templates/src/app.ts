{% if use_typescript %}import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import indexRoutes from './routes/index';
import healthRoutes from './routes/health';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Logging middleware
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}
app.use(logger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', indexRoutes);
app.use('/health', healthRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;{% else %}const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { config } = require('./config');
const { logger } = require('./middleware/logger');
const { errorHandler } = require('./middleware/errorHandler');
const indexRoutes = require('./routes/index');
const healthRoutes = require('./routes/health');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Logging middleware
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}
app.use(logger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', indexRoutes);
app.use('/health', healthRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;{% endif %}