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