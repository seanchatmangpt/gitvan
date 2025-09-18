import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Eye,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Sparkles,
  Brain,
  Cpu,
  Database,
  Cloud,
  Shield,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

const iconMap = {
  Users,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Eye,
  Activity,
  Clock,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Cpu,
  Database,
  Cloud,
  Shield,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
};

interface StatsCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: keyof typeof iconMap;
  className?: string;
  trend?: {
    data: number[];
    period: string;
  };
  aiInsight?: {
    recommendation: string;
    confidence: number;
    impact: "high" | "medium" | "low";
  };
  realTime?: boolean;
  loading?: boolean;
  target?: number;
  format?: "number" | "currency" | "percentage" | "duration";
  precision?: number;
  showTrend?: boolean;
  showAI?: boolean;
  showProgress?: boolean;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: IconName,
  className = "",
  trend,
  aiInsight,
  realTime = false,
  loading = false,
  target,
  format = "number",
  precision = 0,
  showTrend = true,
  showAI = false,
  showProgress = false,
  onClick,
}: StatsCardProps) {
  const Icon = iconMap[IconName];

  const changeColor = {
    positive: "text-green-600 dark:text-green-400",
    negative: "text-red-600 dark:text-red-400",
    neutral: "text-gray-600 dark:text-gray-400",
  };

  const changeBgColor = {
    positive: "bg-green-50 dark:bg-green-950/20",
    negative: "bg-red-50 dark:bg-red-950/20",
    neutral: "bg-gray-50 dark:bg-gray-950/20",
  };

  const ChangeIcon = changeType === "positive" ? ArrowUpRight : ArrowDownRight;

  // Real-time data fetching
  const { data: realTimeData } = useQuery({
    queryKey: ["stats", title.toLowerCase().replace(/\s+/g, "-")],
    queryFn: async () => {
      const response = await fetch(
        `/api/metrics/${title.toLowerCase().replace(/\s+/g, "-")}`
      );
      return response.json();
    },
    enabled: realTime,
    refetchInterval: 5000,
  });

  // Format value based on type
  const formatValue = (val: string | number) => {
    if (typeof val === "string") return val;

    switch (format) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: precision,
        }).format(val);
      case "percentage":
        return `${val.toFixed(precision)}%`;
      case "duration":
        return `${val}s`;
      default:
        return new Intl.NumberFormat("en-US", {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(val);
    }
  };

  const displayValue = realTime && realTimeData ? realTimeData.value : value;
  const displayChange = realTime && realTimeData ? realTimeData.change : change;

  // Calculate progress percentage if target is provided
  const progressPercentage =
    target && typeof displayValue === "number"
      ? Math.min((displayValue / target) * 100, 100)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        "bg-card rounded-xl shadow-sm border border-border p-6 relative overflow-hidden group cursor-pointer",
        onClick && "hover:shadow-lg transition-all duration-300",
        className
      )}
      onClick={onClick}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600" />
      </div>

      {/* Real-time indicator */}
      {realTime && (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-3 right-3 w-2 h-2 bg-green-500 rounded-full"
        />
      )}

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
          />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <motion.p
              key={displayValue}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-3xl font-bold text-foreground mb-2"
            >
              {formatValue(displayValue)}
            </motion.p>

            {/* Change indicator */}
            {showTrend && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  changeBgColor[changeType],
                  changeColor[changeType]
                )}
              >
                <ChangeIcon className="w-3 h-3 mr-1" />
                {displayChange}
              </motion.div>
            )}
          </div>

          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && progressPercentage !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* AI Insight */}
        {showAI && aiInsight && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800"
                >
                  <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    AI Insight
                  </span>
                  <Badge
                    variant={
                      aiInsight.impact === "high"
                        ? "destructive"
                        : aiInsight.impact === "medium"
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {aiInsight.confidence}% confidence
                  </Badge>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{aiInsight.recommendation}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Trend visualization */}
        {trend && trend.data.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Trend ({trend.period})
              </span>
              <div className="flex items-center space-x-1">
                {trend.data.slice(-3).map((point, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    animate={{
                      height: `${(point / Math.max(...trend.data)) * 100}%`,
                    }}
                    transition={{ delay: 0.1 * index, duration: 0.5 }}
                    className="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full"
                    style={{
                      height: `${(point / Math.max(...trend.data)) * 100}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Click indicator */}
        {onClick && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl flex items-center justify-center"
          >
            <span className="text-xs font-medium text-muted-foreground">
              Click for details
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
