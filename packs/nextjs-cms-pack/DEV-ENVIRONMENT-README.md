# GitVan Next.js CMS - Development Environment

A **hyper-advanced dev container** setup for Next.js CMS development with Docker Compose.

## 🚀 Quick Start

### 1. Setup Development Environment

```bash
# Run the setup script
./packs/nextjs-cms-pack/setup-dev-environment.sh my-cms-project

# Navigate to your project
cd my-cms-project

# Start the development server
docker-compose up
```

### 2. Access Your Site

- **Development Server**: http://localhost:3000
- **Alternative Port**: http://localhost:3001
- **Hot Reloading**: ✅ Enabled
- **File Watching**: ✅ Enabled

## 🐳 Docker Compose Services

### Core Services

- **`nextjs-cms`**: Main Next.js development server
  - Port: 3000 (primary), 3001 (alternative)
  - Hot reloading enabled
  - Volume mounting for live editing
  - GitVan integration

### Optional Services (Profiles)

- **`postgres`**: PostgreSQL database
  - Port: 5432
  - Start with: `docker-compose --profile database up`

- **`redis`**: Redis cache
  - Port: 6379
  - Start with: `docker-compose --profile cache up`

## 📁 Project Structure

```
my-cms-project/
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile.dev          # Development Dockerfile
├── package.json            # Dependencies and scripts
├── next.config.mjs         # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   ├── components/         # React components
│   └── lib/                # Utility functions
├── content/
│   ├── pages/              # Markdown content
│   │   └── index.md        # Home page content
│   └── components/         # Embeddable React components
└── public/                 # Static assets
```

## 🔧 Development Commands

### Docker Compose Commands

```bash
# Start development server
docker-compose up

# Start in background
docker-compose up -d

# Stop server
docker-compose down

# View logs
docker-compose logs -f

# Access container shell
docker-compose exec nextjs-cms bash

# Rebuild container
docker-compose up --build

# Start with optional services
docker-compose --profile database --profile cache up
```

### Container Commands

```bash
# Access container shell
docker-compose exec nextjs-cms bash

# Install new dependencies
docker-compose exec nextjs-cms npm install package-name

# Run build
docker-compose exec nextjs-cms npm run build

# Run linting
docker-compose exec nextjs-cms npm run lint
```

## 🌐 Development Features

### ✅ **Hot Reloading**
- File changes trigger automatic rebuilds
- Browser refreshes automatically
- Fast refresh for React components

### ✅ **Volume Mounting**
- Host files are mounted into container
- Changes on host are immediately visible in container
- No need to rebuild for code changes

### ✅ **Port Forwarding**
- Development server accessible on host
- Multiple ports available (3000, 3001)
- Easy access from browser

### ✅ **GitVan Integration**
- GitVan jobs available in container
- Git hooks and automation
- Knowledge graph and workflows

### ✅ **Development Tools**
- Git, bash, curl, vim, nano, htop included
- Node.js 20 with pnpm
- TypeScript support
- ESLint and Prettier ready

## 📝 Content Management

### Creating Pages

1. **Add markdown files** to `content/pages/`
2. **Use frontmatter** for metadata:
   ```markdown
   ---
   title: "My Page"
   description: "Page description"
   date: "2025-09-18"
   ---
   
   # My Page Content
   
   This is my page content in markdown.
   ```

### Adding Components

1. **Create React components** in `content/components/`
2. **Import and use** in markdown:
   ```markdown
   <MyComponent prop="value" />
   ```

### Styling

- **Tailwind CSS** for utility-first styling
- **Global styles** in `src/app/globals.css`
- **Component styles** in individual components
- **Responsive design** built-in

## 🚀 Deployment

### Static Export

```bash
# Build for production
docker-compose exec nextjs-cms npm run build

# Output will be in 'out/' directory
# Ready for GitHub Pages, Netlify, Vercel, etc.
```

### GitHub Pages

1. **Push to GitHub repository**
2. **Enable GitHub Pages** in repository settings
3. **Set source** to GitHub Actions
4. **Use included workflow** (`.github/workflows/deploy.yml`)

## 🔧 Configuration

### Environment Variables

```bash
# In docker-compose.yml or .env file
NODE_ENV=development
NEXT_PUBLIC_BASE_PATH=
WATCHPACK_POLLING=true
```

### Custom Ports

```yaml
# In docker-compose.yml
ports:
  - "8080:3000"  # Use port 8080 instead of 3000
```

### Additional Services

```yaml
# Add to docker-compose.yml
services:
  my-service:
    image: my-image
    ports:
      - "8080:80"
    networks:
      - cms-network
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Change port in docker-compose.yml
   ports:
     - "3001:3000"
   ```

2. **File changes not detected**:
   ```bash
   # Ensure WATCHPACK_POLLING=true in environment
   ```

3. **Container won't start**:
   ```bash
   # Check logs
   docker-compose logs
   
   # Rebuild container
   docker-compose up --build
   ```

4. **Dependencies not installed**:
   ```bash
   # Reinstall in container
   docker-compose exec nextjs-cms npm install
   ```

### Performance Tips

1. **Use volume mounting** for better performance
2. **Exclude node_modules** from host mounting
3. **Use .dockerignore** to exclude unnecessary files
4. **Enable polling** for file watching in Docker

## 🎯 Benefits

### ✅ **Consistent Environment**
- Same environment across all machines
- No "works on my machine" issues
- Reproducible builds

### ✅ **Easy Setup**
- One command to start development
- No local Node.js installation required
- Automatic dependency management

### ✅ **Advanced Features**
- Hot reloading and file watching
- Multiple services (database, cache)
- GitVan integration
- Production-ready configuration

### ✅ **Developer Experience**
- Fast startup and rebuilds
- Easy debugging and logging
- Container shell access
- Volume mounting for live editing

## 🚀 Next Steps

1. **Start developing**: `docker-compose up`
2. **Edit content**: Modify files in `content/pages/`
3. **Add components**: Create React components
4. **Customize styling**: Update Tailwind config
5. **Deploy**: Build and deploy to your platform

**Happy coding! 🎉**
