{% if use_typescript %}import app from './app';
import { config } from './config';

const PORT = config.port || {{ port }};

app.listen(PORT, () => {
  console.log(`🚀 {{ project_name }} server running on port ${PORT}`);
  console.log(`📖 Environment: ${config.nodeEnv}`);
  console.log(`🔗 API available at: http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
});{% else %}const app = require('./app');
const { config } = require('./config');

const PORT = config.port || {{ port }};

app.listen(PORT, () => {
  console.log(`🚀 {{ project_name }} server running on port ${PORT}`);
  console.log(`📖 Environment: ${config.nodeEnv}`);
  console.log(`🔗 API available at: http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
});{% endif %}