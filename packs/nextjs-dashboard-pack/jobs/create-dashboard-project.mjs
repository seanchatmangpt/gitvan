export default {
  meta: {
    name: "create-dashboard-project",
    desc: "Creates a comprehensive Next.js dashboard project with modern UI and advanced features",
  },
  async run(ctx) {
    const { payload } = ctx;

    const projectName = payload?.project_name || "my-dashboard";
    const useAuth = payload?.use_auth !== false;
    const useDatabase = payload?.use_database !== false;
    const useRealTime = payload?.use_realtime !== false;
    const theme = payload?.theme || "modern";

    console.log(`🚀 Creating Next.js Dashboard project: ${projectName}`);
    console.log(`🔐 Authentication: ${useAuth ? "Yes" : "No"}`);
    console.log(`🗄️ Database: ${useDatabase ? "Yes" : "No"}`);
    console.log(`⚡ Real-time: ${useRealTime ? "Yes" : "No"}`);
    console.log(`🎨 Theme: ${theme}`);

    // Create the project structure
    const fs = await import("fs/promises");
    const path = await import("path");

    try {
      // Create directories
      const dirs = [
        "src/app",
        "src/app/dashboard",
        "src/app/dashboard/analytics",
        "src/app/dashboard/users",
        "src/app/dashboard/settings",
        "src/app/api",
        "src/app/api/auth",
        "src/components/dashboard",
        "src/components/ui",
        "src/lib",
        "src/hooks",
        "src/types",
        "src/data",
        "src/styles",
        "public/icons",
        "public/images",
        "prisma",
        "components",
        ".env.local",
      ];

      for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
      }

      // Create Next.js config
      const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for 2026
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    serverComponentsExternalPackages: [],
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    webVitalsAttribution: ['CLS', 'LCP'],
    instrumentationHook: true,
    typedRoutes: true,
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001'],
    },
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\\\/]node_modules[\\\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;`;

      await fs.writeFile("next.config.mjs", nextConfig);

      // Create package.json with all dependencies
      const packageJson = {
        name: projectName,
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "next lint",
          "db:push": "prisma db push",
          "db:studio": "prisma studio",
          "db:generate": "prisma generate",
        },
        dependencies: {
          next: "^15.5.2",
          react: "^19.0.0",
          "react-dom": "^19.0.0",
          typescript: "^5.7.0",
          "@types/node": "^22.0.0",
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0",
          tailwindcss: "^3.4.0",
          autoprefixer: "^10.4.0",
          postcss: "^8.4.0",
          "chart.js": "^4.4.0",
          "react-chartjs-2": "^5.2.0",
          "framer-motion": "^11.11.0",
          "lucide-react": "^0.460.0",
          "react-hook-form": "^7.53.0",
          "@hookform/resolvers": "^3.9.0",
          zod: "^3.23.0",
          clsx: "^2.1.0",
          "tailwind-merge": "^2.5.0",
          "class-variance-authority": "^0.7.0",
          "react-hot-toast": "^2.4.1",
          "date-fns": "^4.1.0",
          recharts: "^2.12.0",
          // shadcn/ui components (Radix UI primitives)
          "@radix-ui/react-accordion": "^1.2.0",
          "@radix-ui/react-alert-dialog": "^1.1.0",
          "@radix-ui/react-avatar": "^1.1.0",
          "@radix-ui/react-checkbox": "^1.1.0",
          "@radix-ui/react-dialog": "^1.1.0",
          "@radix-ui/react-dropdown-menu": "^2.1.0",
          "@radix-ui/react-label": "^2.1.0",
          "@radix-ui/react-popover": "^1.1.0",
          "@radix-ui/react-progress": "^1.1.0",
          "@radix-ui/react-radio-group": "^1.2.0",
          "@radix-ui/react-select": "^2.1.0",
          "@radix-ui/react-separator": "^1.1.0",
          "@radix-ui/react-slider": "^1.2.0",
          "@radix-ui/react-switch": "^1.1.0",
          "@radix-ui/react-tabs": "^1.1.0",
          "@radix-ui/react-toast": "^1.2.0",
          "@radix-ui/react-tooltip": "^1.1.0",
          // deck.gl for advanced data visualization
          "deck.gl": "^9.0.0",
          "@deck.gl/core": "^9.0.0",
          "@deck.gl/layers": "^9.0.0",
          "@deck.gl/react": "^9.0.0",
          "@deck.gl/geo-layers": "^9.0.0",
          "@deck.gl/aggregation-layers": "^9.0.0",
          "@deck.gl/mesh-layers": "^9.0.0",
          "@deck.gl/experimental-layers": "^9.0.0",
          "@tanstack/react-query": "^5.59.0",
          "@tanstack/react-table": "^8.20.0",
          cmdk: "^1.0.0",
          sonner: "^1.4.0",
          vaul: "^0.9.0",
          "embla-carousel-react": "^8.3.0",
          "react-resizable-panels": "^2.1.0",
          "react-use": "^17.5.0",
          zustand: "^5.0.0",
          jotai: "^2.9.0",
          immer: "^10.1.0",
          nanoid: "^5.0.0",
          "react-intersection-observer": "^9.13.0",
          "react-virtualized-auto-sizer": "^1.0.24",
          "react-window": "^1.8.8",
          "react-window-infinite-loader": "^1.0.9",
          "next-themes": "^0.4.0",
          // Local data storage instead of external DB
          lowdb: "^7.0.0",
          "@types/lowdb": "^1.0.0",
          // AI integration (optional)
          openai: "^4.67.0",
          // Analytics and monitoring
          "@vercel/analytics": "^1.3.0",
          // Testing
          playwright: "^1.48.0",
          jest: "^29.7.0",
          "@testing-library/react": "^16.0.0",
          "@testing-library/jest-dom": "^6.4.0",
          tsx: "^4.7.0",
          "webpack-bundle-analyzer": "^4.10.0",
        },
        devDependencies: {
          eslint: "^9.0.0",
          "eslint-config-next": "^15.5.2",
          "@tailwindcss/forms": "^0.5.9",
          "@tailwindcss/typography": "^0.5.15",
          "@tailwindcss/container-queries": "^0.1.1",
          "@types/react-window": "^1.8.8",
          "@types/react-window-infinite-loader": "^1.0.9",
          prettier: "^3.3.0",
          "prettier-plugin-tailwindcss": "^0.6.8",
          "@typescript-eslint/eslint-plugin": "^8.0.0",
          "@typescript-eslint/parser": "^8.0.0",
          "eslint-plugin-react": "^7.37.0",
          "eslint-plugin-react-hooks": "^5.0.0",
          "eslint-plugin-jsx-a11y": "^6.10.0",
          "eslint-plugin-import": "^2.31.0",
          "eslint-plugin-unused-imports": "^4.1.0",
          "eslint-plugin-perfectionist": "^4.0.0",
          husky: "^9.1.0",
          "lint-staged": "^15.2.10",
          "typescript-eslint": "^8.0.0",
        },
      };

      // Add authentication dependencies (simplified)
      if (useAuth) {
        packageJson.dependencies["next-auth"] = "^4.24.11";
      }

      // Note: Database and real-time features now use local storage
      // No external dependencies needed for basic functionality

      await fs.writeFile("package.json", JSON.stringify(packageJson, null, 2));

      // Create main layout
      const layout = `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${projectName} - Modern Dashboard',
  description: 'A comprehensive dashboard built with Next.js and modern UI components',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}`;

      await fs.writeFile("src/app/layout.tsx", layout);

      // Create main dashboard page
      const dashboardPage = `import { Suspense } from 'react'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Chart } from '@/components/dashboard/Chart'
import { DataTable } from '@/components/dashboard/DataTable'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome to your modern dashboard</p>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Suspense fallback={<div className="h-32 bg-gray-200 rounded-lg animate-pulse" />}>
              <StatsCard
                title="Total Users"
                value="12,345"
                change="+12%"
                changeType="positive"
                icon="Users"
              />
            </Suspense>
            <Suspense fallback={<div className="h-32 bg-gray-200 rounded-lg animate-pulse" />}>
              <StatsCard
                title="Revenue"
                value="$45,678"
                change="+8%"
                changeType="positive"
                icon="DollarSign"
              />
            </Suspense>
            <Suspense fallback={<div className="h-32 bg-gray-200 rounded-lg animate-pulse" />}>
              <StatsCard
                title="Orders"
                value="1,234"
                change="-3%"
                changeType="negative"
                icon="ShoppingCart"
              />
            </Suspense>
            <Suspense fallback={<div className="h-32 bg-gray-200 rounded-lg animate-pulse" />}>
              <StatsCard
                title="Conversion"
                value="3.2%"
                change="+5%"
                changeType="positive"
                icon="TrendingUp"
              />
            </Suspense>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue Overview</h3>
              <Suspense fallback={<div className="h-64 bg-gray-200 rounded animate-pulse" />}>
                <Chart type="line" data={[]} />
              </Suspense>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">User Distribution</h3>
              <Suspense fallback={<div className="h-64 bg-gray-200 rounded animate-pulse" />}>
                <Chart type="doughnut" data={[]} />
              </Suspense>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </div>
            <Suspense fallback={<div className="h-64 bg-gray-200 animate-pulse" />}>
              <DataTable data={[]} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}`;

      await fs.writeFile("src/app/dashboard/page.tsx", dashboardPage);

      // Create analytics page
      const analyticsPage = `import { Suspense } from 'react'
import { Chart } from '@/components/dashboard/Chart'
import { StatsCard } from '@/components/dashboard/StatsCard'

export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">Detailed analytics and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Page Views"
          value="1.2M"
          change="+15%"
          changeType="positive"
          icon="Eye"
        />
        <StatsCard
          title="Bounce Rate"
          value="42%"
          change="-8%"
          changeType="positive"
          icon="Activity"
        />
        <StatsCard
          title="Avg. Session"
          value="3m 24s"
          change="+12%"
          changeType="positive"
          icon="Clock"
        />
      </div>

      {/* Advanced Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Traffic Sources</h3>
          <Suspense fallback={<div className="h-80 bg-gray-200 rounded animate-pulse" />}>
            <Chart type="bar" data={[]} />
          </Suspense>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
          <Suspense fallback={<div className="h-80 bg-gray-200 rounded animate-pulse" />}>
            <Chart type="funnel" data={[]} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}`;

      await fs.writeFile("src/app/dashboard/analytics/page.tsx", analyticsPage);

      // Create users page
      const usersPage = `import { Suspense } from 'react'
import { DataTable } from '@/components/dashboard/DataTable'
import { UserCard } from '@/components/dashboard/UserCard'
import { Button } from '@/components/ui/Button'

export default function UsersPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-2">Manage your users and permissions</p>
        </div>
        <Button>Add User</Button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <UserCard
          name="Active Users"
          count="1,234"
          percentage="85%"
          trend="up"
        />
        <UserCard
          name="New Users"
          count="89"
          percentage="12%"
          trend="up"
        />
        <UserCard
          name="Premium Users"
          count="456"
          percentage="37%"
          trend="up"
        />
        <UserCard
          name="Churned Users"
          count="23"
          percentage="2%"
          trend="down"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">All Users</h3>
        </div>
        <Suspense fallback={<div className="h-96 bg-gray-200 animate-pulse" />}>
          <DataTable data={[]} />
        </Suspense>
      </div>
    </div>
  )
}`;

      await fs.writeFile("src/app/dashboard/users/page.tsx", usersPage);

      // Create settings page
      const settingsPage = `import { Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your dashboard settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">General Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dashboard Name
              </label>
              <Input placeholder="My Dashboard" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Zone
              </label>
              <Select>
                <option>UTC-8 (Pacific)</option>
                <option>UTC-5 (Eastern)</option>
                <option>UTC+0 (GMT)</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <Select>
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
              </Select>
            </div>
            <Button>Save Changes</Button>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email Notifications</span>
              <input type="checkbox" className="rounded" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Push Notifications</span>
              <input type="checkbox" className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">SMS Notifications</span>
              <input type="checkbox" className="rounded" />
            </div>
            <Button variant="outline">Update Preferences</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}`;

      await fs.writeFile("src/app/dashboard/settings/page.tsx", settingsPage);

      // Create environment file
      const envExample = `# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dashboard_db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Redis (for real-time features)
REDIS_URL="redis://localhost:6379"

# API Keys
API_KEY="your-api-key"`;

      await fs.writeFile(".env.example", envExample);

      console.log(`✅ Created Next.js Dashboard project: ${projectName}`);
      console.log(`📁 Files created:`);
      console.log(`   - next.config.mjs`);
      console.log(`   - package.json`);
      console.log(`   - src/app/layout.tsx`);
      console.log(`   - src/app/dashboard/page.tsx`);
      console.log(`   - src/app/dashboard/analytics/page.tsx`);
      console.log(`   - src/app/dashboard/users/page.tsx`);
      console.log(`   - src/app/dashboard/settings/page.tsx`);
      console.log(`   - .env.example`);

      return {
        status: "success",
        message: `Created Next.js Dashboard project: ${projectName}`,
        data: {
          projectName,
          useAuth,
          useDatabase,
          useRealTime,
          theme,
          filesCreated: 8,
        },
      };
    } catch (error) {
      console.error("❌ Error creating project:", error.message);
      return {
        status: "error",
        message: `Failed to create project: ${error.message}`,
        error: error.message,
      };
    }
  },
};
