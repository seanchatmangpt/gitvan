#!/bin/bash

# Test script for live updates in the dashboard pack
# This script tests that changes to files are reflected in real-time

set -e

echo "🧪 Testing Live Updates for Dashboard Pack"
echo "=========================================="

# Check if Docker Compose is running
if ! docker-compose ps | grep -q "dashboard.*Up"; then
  echo "❌ Dashboard is not running. Please start it first with:"
  echo "   docker-compose up --build"
  exit 1
fi

echo "✅ Dashboard is running"
echo ""

# Test 1: Check if the dashboard is accessible
echo "🔍 Test 1: Checking dashboard accessibility..."
if curl -s http://localhost:9000 | grep -q "Hyper-Advanced Dashboard"; then
  echo "✅ Dashboard is accessible at http://localhost:9000"
else
  echo "❌ Dashboard is not accessible"
  exit 1
fi

# Test 2: Check if the dashboard page is accessible
echo "🔍 Test 2: Checking dashboard page accessibility..."
if curl -s http://localhost:9000/dashboard | grep -q "AI Dashboard"; then
  echo "✅ Dashboard page is accessible at http://localhost:9000/dashboard"
else
  echo "❌ Dashboard page is not accessible"
  exit 1
fi

# Test 3: Test live updates by modifying a file
echo "🔍 Test 3: Testing live updates..."
echo "📝 Modifying the main page..."

# Create a backup of the original page
cp src/app/page.tsx src/app/page.tsx.backup

# Modify the page with a timestamp
cat > src/app/page.tsx << 'EOF'
import Link from "next/link";

export default function HomePage() {
  const timestamp = new Date().toLocaleString();
  
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
          
          {/* Live Update Indicator */}
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-8 max-w-2xl mx-auto">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
              <span className="font-semibold">Live Update Test</span>
            </div>
            <p className="text-sm mt-2">Last updated: {timestamp}</p>
          </div>
          
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

echo "⏳ Waiting for live update to take effect..."
sleep 5

# Test 4: Check if the live update is reflected
echo "🔍 Test 4: Checking if live update is reflected..."
if curl -s http://localhost:9000 | grep -q "Live Update Test"; then
  echo "✅ Live update is working! Changes are reflected in real-time"
else
  echo "❌ Live update is not working"
  exit 1
fi

# Test 5: Test dashboard page live updates
echo "🔍 Test 5: Testing dashboard page live updates..."
echo "📝 Modifying the dashboard page..."

# Create a backup of the original dashboard page
cp src/app/dashboard/page.tsx src/app/dashboard/page.tsx.backup

# Modify the dashboard page
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
  const timestamp = new Date().toLocaleString();
  
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
                  AI Dashboard v2.0 - Live Update Test
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
        {/* Live Update Banner */}
        <Card className="mb-8 bg-gradient-to-r from-green-600 to-blue-600 text-white border-0">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">🔄 Live Update Test</h2>
                <p className="text-green-100">
                  This dashboard is updating in real-time! Changes are reflected immediately.
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{timestamp}</div>
                <div className="text-green-100">Last Updated</div>
              </div>
            </div>
          </div>
        </Card>

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

echo "⏳ Waiting for dashboard live update to take effect..."
sleep 5

# Test 6: Check if the dashboard live update is reflected
echo "🔍 Test 6: Checking if dashboard live update is reflected..."
if curl -s http://localhost:9000/dashboard | grep -q "Live Update Test"; then
  echo "✅ Dashboard live update is working! Changes are reflected in real-time"
else
  echo "❌ Dashboard live update is not working"
  exit 1
fi

# Restore original files
echo "🔄 Restoring original files..."
mv src/app/page.tsx.backup src/app/page.tsx
mv src/app/dashboard/page.tsx.backup src/app/dashboard/page.tsx

echo "⏳ Waiting for restoration to take effect..."
sleep 5

# Test 7: Verify restoration
echo "🔍 Test 7: Verifying file restoration..."
if curl -s http://localhost:9000 | grep -q "Live Update Test"; then
  echo "❌ File restoration failed"
  exit 1
else
  echo "✅ File restoration successful"
fi

echo ""
echo "🎉 All live update tests passed!"
echo ""
echo "📊 Test Results Summary:"
echo "  ✅ Dashboard accessibility: PASSED"
echo "  ✅ Dashboard page accessibility: PASSED"
echo "  ✅ Main page live updates: PASSED"
echo "  ✅ Dashboard page live updates: PASSED"
echo "  ✅ File restoration: PASSED"
echo ""
echo "🔗 Dashboard is fully functional with live updates!"
echo "🌐 Access it at: http://localhost:9000"
echo "📊 Dashboard page: http://localhost:9000/dashboard"

