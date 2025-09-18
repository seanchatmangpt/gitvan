import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import {
  Home,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  Zap,
  Shield,
  Database,
  Cloud,
  Cpu,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardAtom } from "@/lib/atoms";
import { useAuth } from "@/hooks/useAuth";
import { CommandMenu } from "@/components/ui/CommandMenu";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = "" }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [dashboardState, setDashboardState] = useAtom(dashboardAtom);

  // Real-time system status
  const { data: systemStatus } = useQuery({
    queryKey: ["system-status"],
    queryFn: async () => {
      const response = await fetch("/api/system/status");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      badge: systemStatus?.alerts || 0,
      description: "Overview and key metrics",
    },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
      description: "Data insights and reports",
    },
    {
      name: "Users",
      href: "/dashboard/users",
      icon: Users,
      badge: systemStatus?.activeUsers || 0,
      description: "User management",
    },
    {
      name: "Infrastructure",
      href: "/dashboard/infrastructure",
      icon: Database,
      description: "System monitoring",
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      description: "Configuration",
    },
  ];

  const quickActions = [
    {
      name: "New Report",
      icon: BarChart3,
      action: () => router.push("/dashboard/analytics/new"),
    },
    {
      name: "Add User",
      icon: Users,
      action: () => router.push("/dashboard/users/new"),
    },
    {
      name: "System Check",
      icon: Activity,
      action: () => router.push("/dashboard/infrastructure"),
    },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md bg-background shadow-lg border border-border"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "lg:translate-x-0 fixed inset-y-0 left-0 z-50 w-80 bg-background/95 backdrop-blur-xl shadow-2xl border-r border-border",
          isCollapsed && "lg:w-16",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo and Collapse Button */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Dashboard Pro
                </h1>
              )}
            </motion.div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-1.5 rounded-md hover:bg-accent transition-colors"
            >
              <motion.div
                animate={{ rotate: isCollapsed ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-4 h-4" />
              </motion.div>
            </button>
          </div>

          {/* System Status */}
          {!isCollapsed && systemStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-6 mt-4 p-3 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  All systems operational
                </span>
              </div>
              <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                {systemStatus.activeUsers} active users • {systemStatus.uptime}%
                uptime
              </div>
            </motion.div>
          )}

          {/* Search */}
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="px-6 mt-4"
            >
              <CommandMenu />
            </motion.div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-6 py-6 space-y-2">
            {navigation.map((item, index) => {
              const Icon = item.icon;
              const isActive = dashboardState.currentPage === item.href;

              return (
                <motion.a
                  key={item.name}
                  href={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.name}</span>
                      {item.badge && item.badge > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full"
                        >
                          {item.badge}
                        </motion.span>
                      )}
                    </>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </motion.a>
              );
            })}
          </nav>

          {/* Quick Actions */}
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="px-6 py-4 border-t border-border"
            >
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-1">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={action.action}
                      className="flex items-center w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {action.name}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* User section */}
          <div className="px-6 py-4 border-t border-border">
            <UserMenu user={user} onSignOut={signOut} collapsed={isCollapsed} />
          </div>
        </div>
      </motion.div>
    </>
  );
}
