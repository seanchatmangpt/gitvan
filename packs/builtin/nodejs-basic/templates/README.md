# {{ project_name }}

A Node.js Express API created with GitVan.

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
# or
gitvan run dev

# Build for production (TypeScript only)
npm run build

# Start production server
npm start
```

The server will be available at [http://localhost:{{ port }}](http://localhost:{{ port }}).

## Features

- 🚀 Express.js web framework
{% if use_typescript %}- 🦾 TypeScript for type safety{% endif %}
- 🛡️ Security middleware (Helmet, CORS)
- 📝 Request logging (Morgan)
- 🔧 Environment configuration
- 🩺 Health check endpoints
- 🚨 Error handling middleware
- ✅ Testing setup with Jest
- 📦 GitVan for workflow automation

## API Endpoints

- `GET /` - Welcome message and API info
- `GET /api` - API status and metadata
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health information

## GitVan Jobs

This project includes GitVan jobs for common development tasks:

```bash
# Development server with hot reload
gitvan run dev

# Build application (TypeScript)
gitvan run build

# Start production server
gitvan run start

# Run tests
gitvan run test

# Lint code
gitvan run lint
```

## Project Structure

```
src/
├── app.ts          # Express app configuration
├── server.ts       # Server entry point
├── config/         # Configuration files
├── middleware/     # Custom middleware
├── routes/         # Route handlers
└── types/          # TypeScript type definitions
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: {{ port }})
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - CORS allowed origins

## Learn More

- [Express.js Documentation](https://expressjs.com/)
- [GitVan Documentation](https://github.com/ruvnet/gitvan)
{% if use_typescript %}- [TypeScript Documentation](https://www.typescriptlang.org/docs/){% endif %}