import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import {
  Bell,
  Search,
  User,
  Settings,
  Moon,
  Sun,
  ChevronDown,
  Zap,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  SkipBack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardAtom } from "@/lib/atoms";
import { useAuth } from "@/hooks/useAuth";
import { CommandMenu } from "@/components/ui/CommandMenu";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";

interface HeaderProps {
  className?: string;
}

export function Header({ className = "" }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);
  const [batteryLevel, setBatteryLevel] = React.useState(85);
  const [isMuted, setIsMuted] = React.useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const [dashboardState, setDashboardState] = useAtom(dashboardAtom);

  // Real-time system metrics
  const { data: systemMetrics } = useQuery({
    queryKey: ["system-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/system/metrics");
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // AI-powered insights
  const { data: aiInsights } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const response = await fetch("/api/ai/insights");
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Monitor battery level
  React.useEffect(() => {
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
      });
    }
  }, []);

  const notifications = [
    {
      id: 1,
      title: "System Update Available",
      message: "New dashboard features are ready to install",
      type: "info",
      time: "2 minutes ago",
      unread: true,
    },
    {
      id: 2,
      title: "Performance Alert",
      message: "CPU usage exceeded 80% threshold",
      type: "warning",
      time: "5 minutes ago",
      unread: true,
    },
    {
      id: 3,
      title: "Backup Complete",
      message: "Daily backup completed successfully",
      type: "success",
      time: "1 hour ago",
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "bg-background/95 backdrop-blur-xl shadow-sm border-b border-border px-6 py-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        {/* Left side - Breadcrumb and Status */}
        <div className="flex items-center space-x-4">
          <Breadcrumb />

          {/* System Status Indicators */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Connection Status */}
            <motion.div
              animate={{ scale: isOnline ? 1 : 0.8 }}
              className="flex items-center space-x-1"
            >
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
            </motion.div>

            {/* Battery Level */}
            <div className="flex items-center space-x-1">
              {batteryLevel > 20 ? (
                <Battery className="w-4 h-4 text-green-500" />
              ) : (
                <BatteryLow className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {batteryLevel}%
              </span>
            </div>

            {/* System Performance */}
            {systemMetrics && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">
                    CPU: {systemMetrics.cpu}%
                  </span>
                </div>
                <div className="w-16">
                  <Progress value={systemMetrics.cpu} className="h-1" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center - AI Insights */}
        {aiInsights && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden lg:flex items-center space-x-4"
          >
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                AI Insight: {aiInsights.recommendation}
              </span>
            </div>

            {aiInsights.trend && (
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600 dark:text-green-400">
                  +{aiInsights.trend}%
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Right side - Actions */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <CommandMenu />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Audio Controls */}
          <div className="hidden md:flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                >
                  {unreadCount}
                </motion.span>
              )}
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-50"
                >
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {notification.type === "info" && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            {notification.type === "warning" && (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                            {notification.type === "success" && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.time}
                            </p>
                          </div>
                          {notification.unread && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-border">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Notifications
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <UserMenu user={user} />
        </div>
      </div>

      {/* Mobile AI Insights */}
      {aiInsights && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="lg:hidden mt-4 pt-4 border-t border-border"
        >
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {aiInsights.recommendation}
            </span>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
