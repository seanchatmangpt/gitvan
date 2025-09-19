#!/bin/bash

# Setup script for Next.js Dashboard Pack with Docker Compose
# This script creates a new project and starts the development environment

set -e

echo "🚀 Setting up Next.js Dashboard Pack with Docker Compose"
echo "========================================================"

# Get project name from user or use default
PROJECT_NAME=${1:-"hyper-advanced-dashboard"}

echo "📁 Creating project: $PROJECT_NAME"

# Create project directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Copy pack templates
echo "📦 Copying pack templates..."
cp -r ../packs/nextjs-dashboard-pack/templates/* .

# Copy Docker files
echo "🐳 Setting up Docker environment..."
cp ../packs/nextjs-dashboard-pack/docker-compose.yml .
cp ../packs/nextjs-dashboard-pack/Dockerfile.dev .

# Create package.json with updated dependencies
echo "📝 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "hyper-advanced-dashboard",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.5.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "framer-motion": "^11.11.0",
    "lucide-react": "^0.460.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "class-variance-authority": "^0.7.0",
    "react-hot-toast": "^2.4.1",
    "date-fns": "^4.1.0",
    "recharts": "^2.12.0",
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
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-table": "^8.20.0",
    "cmdk": "^1.0.0",
    "sonner": "^1.4.0",
    "vaul": "^0.8.0",
    "embla-carousel-react": "^8.3.0",
    "react-resizable-panels": "^2.1.0",
    "react-use": "^17.5.0",
    "zustand": "^5.0.0",
    "jotai": "^2.9.0",
    "immer": "^10.1.0",
    "nanoid": "^5.0.0",
    "react-intersection-observer": "^9.13.0",
    "react-virtualized-auto-sizer": "^1.0.24",
    "react-window": "^1.8.8",
    "react-window-infinite-loader": "^1.0.9",
    "next-themes": "^0.4.0",
    "lowdb": "^7.0.0",
    "@types/lowdb": "^1.0.0",
    "openai": "^4.67.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "langchain": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/anthropic": "^0.3.0",
    "posthog-js": "^1.150.0",
    "@vercel/analytics": "^1.3.0",
    "lighthouse": "^12.0.0",
    "playwright": "^1.48.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "tsx": "^4.7.0",
    "webpack-bundle-analyzer": "^4.10.0"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.5.2",
    "@tailwindcss/forms": "^0.5.9",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/container-queries": "^0.1.1",
    "@types/react-window": "^1.8.8",
    "@types/react-window-infinite-loader": "^1.0.9",
    "prettier": "^3.3.0",
    "prettier-plugin-tailwindcss": "^0.6.8",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-jsx-a11y": "^6.10.0",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-unused-imports": "^4.1.0",
    "eslint-plugin-perfectionist": "^4.0.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.2.10",
    "typescript-eslint": "^8.0.0"
  }
}
EOF

# Create Next.js config
echo "⚙️ Creating Next.js configuration..."
cat > next.config.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
    serverComponentsExternalPackages: [],
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    webVitalsAttribution: ["CLS", "LCP"],
    typedRoutes: true,
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:3001"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
EOF

# Create tsconfig.json
echo "📝 Creating TypeScript configuration..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "esModuleInterop": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
EOF

# Create middleware.ts
echo "🔒 Creating middleware..."
cat > middleware.ts << 'EOF'
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
EOF

# Create main page
echo "🏠 Creating main page..."
mkdir -p src/app
cat > src/app/page.tsx << 'EOF'
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">
            Hyper-Advanced Dashboard v2.0
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Built for 2026 with Next.js 15.5.2, React 19, and AI-powered insights.
            Experience the future of web development with intelligent analytics,
            real-time data streaming, and cutting-edge performance optimizations.
          </p>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">🚀 Dashboard Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🧠</span>
                <span>AI-Powered Insights</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">⚡</span>
                <span>Lightning Fast (Turbopack)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🔒</span>
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🌐</span>
                <span>Edge Runtime</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🎨</span>
                <span>Modern UI Components</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📊</span>
                <span>Real-time Data</span>
              </div>
            </div>
            <div className="mt-8">
              <Link 
                href="/dashboard" 
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                View Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF

# Create layout
echo "📱 Creating layout..."
cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyper-Advanced Dashboard",
  description: "Built for 2026 with Next.js 15.5.2, React 19, and AI-powered insights",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
EOF

# Create globals.css
echo "🎨 Creating global styles..."
cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
EOF

# Create dashboard page
echo "📊 Creating dashboard page..."
mkdir -p src/app/dashboard
cat > src/app/dashboard/page.tsx << 'EOF'
import { Suspense } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Chart } from "@/components/dashboard/Chart";
import { DataTable } from "@/components/dashboard/DataTable";
import { CommandMenu } from "@/components/ui/CommandMenu";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Brain,
  Zap,
  Shield,
  Globe
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* AI-Powered Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Dashboard v2.0
                </h1>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Zap className="h-4 w-4" />
                <span>Next.js 15.5.2 + React 19</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Security Enabled
              </Button>
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                Edge Runtime
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* AI Insights Banner */}
        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">🧠 AI-Powered Insights</h2>
                <p className="text-blue-100">
                  Your dashboard is now enhanced with artificial intelligence. 
                  Get intelligent recommendations, predictive analytics, and automated insights.
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">92%</div>
                <div className="text-blue-100">AI Confidence</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Users"
            value="1,250"
            change="+12%"
            changeType="positive"
            icon={Users}
            aiInsight={{
              recommendation: "User growth is accelerating. Consider scaling infrastructure.",
              confidence: 87,
              impact: "high"
            }}
            realTime={true}
            showAI={true}
            showProgress={true}
            target={1500}
          />
          <StatsCard
            title="Revenue"
            value="$45,678"
            change="+8.5%"
            changeType="positive"
            icon={DollarSign}
            aiInsight={{
              recommendation: "Revenue trending upward. Marketing campaigns are effective.",
              confidence: 94,
              impact: "high"
            }}
            realTime={true}
            showAI={true}
            showProgress={true}
            target={50000}
          />
          <StatsCard
            title="Growth Rate"
            value="12.5%"
            change="+2.1%"
            changeType="positive"
            icon={TrendingUp}
            aiInsight={{
              recommendation: "Growth rate is healthy. Consider expanding to new markets.",
              confidence: 89,
              impact: "medium"
            }}
            realTime={true}
            showAI={true}
            showProgress={true}
            target={15}
          />
          <StatsCard
            title="Active Sessions"
            value="890"
            change="+5.2%"
            changeType="positive"
            icon={Activity}
            aiInsight={{
              recommendation: "User engagement is high. Peak hours: 2-4 PM.",
              confidence: 91,
              impact: "medium"
            }}
            realTime={true}
            showAI={true}
            showProgress={true}
            target={1000}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">📈 User Growth Trend</h3>
              <Chart
                type="line"
                data={{
                  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                  datasets: [{
                    label: "Users",
                    data: [650, 720, 800, 850, 920, 1000],
                    borderColor: "rgb(59, 130, 246)",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    tension: 0.4
                  }]
                }}
                title="User Growth"
                aiInsights={{
                  trend: "up",
                  confidence: 92,
                  recommendation: "Growth is accelerating. Consider scaling infrastructure.",
                  anomalies: [
                    {
                      point: 3,
                      value: 850,
                      reason: "Marketing campaign spike"
                    }
                  ]
                }}
                realTime={true}
                interactive={true}
                animated={true}
              />
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">🍩 Revenue Distribution</h3>
              <Chart
                type="doughnut"
                data={{
                  labels: ["Product A", "Product B", "Product C", "Product D"],
                  datasets: [{
                    data: [35, 25, 20, 20],
                    backgroundColor: [
                      "rgb(59, 130, 246)",
                      "rgb(16, 185, 129)",
                      "rgb(245, 158, 11)",
                      "rgb(239, 68, 68)"
                    ]
                  }]
                }}
                title="Revenue Distribution"
                aiInsights={{
                  trend: "stable",
                  confidence: 88,
                  recommendation: "Product A is performing well. Consider increasing inventory.",
                  anomalies: []
                }}
                realTime={true}
                interactive={true}
                animated={true}
              />
            </div>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">👥 Recent Users</h3>
            <DataTable
              data={[
                { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "Active", lastLogin: "2 hours ago" },
                { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User", status: "Active", lastLogin: "1 hour ago" },
                { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Moderator", status: "Inactive", lastLogin: "1 day ago" },
                { id: 4, name: "Alice Brown", email: "alice@example.com", role: "User", status: "Active", lastLogin: "30 minutes ago" },
                { id: 5, name: "Charlie Wilson", email: "charlie@example.com", role: "User", status: "Pending", lastLogin: "Never" }
              ]}
              columns={[
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "role", label: "Role" },
                { key: "status", label: "Status" },
                { key: "lastLogin", label: "Last Login" }
              ]}
              searchable={true}
              sortable={true}
              pagination={true}
              pageSize={10}
              aiInsights={{
                recommendation: "User engagement is high. Consider implementing user onboarding improvements.",
                confidence: 85,
                impact: "medium"
              }}
              realTime={true}
              showAI={true}
            />
          </div>
        </Card>
      </div>

      {/* Command Menu */}
      <CommandMenu />
    </div>
  );
}
EOF

# Create sample data
echo "📊 Creating sample data..."
mkdir -p data
cat > data/sample.json << 'EOF'
{
  "users": [
    { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "Admin", "status": "Active", "lastLogin": "2 hours ago" },
    { "id": 2, "name": "Jane Smith", "email": "jane@example.com", "role": "User", "status": "Active", "lastLogin": "1 hour ago" },
    { "id": 3, "name": "Bob Johnson", "email": "bob@example.com", "role": "Moderator", "status": "Inactive", "lastLogin": "1 day ago" },
    { "id": 4, "name": "Alice Brown", "email": "alice@example.com", "role": "User", "status": "Active", "lastLogin": "30 minutes ago" },
    { "id": 5, "name": "Charlie Wilson", "email": "charlie@example.com", "role": "User", "status": "Pending", "lastLogin": "Never" }
  ],
  "analytics": {
    "totalUsers": 1250,
    "revenue": 45678,
    "growthRate": 12.5,
    "activeSessions": 890
  }
}
EOF

echo ""
echo "✅ Project setup complete!"
echo ""
echo "🚀 Starting Docker Compose..."
echo ""

# Start Docker Compose
docker-compose up --build

echo ""
echo "🎉 Dashboard is now running!"
echo "🌐 Access it at: http://localhost:9000"
echo "📊 Dashboard page: http://localhost:9000/dashboard"
echo ""
echo "💡 To stop the dashboard, run: docker-compose down"

