import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  TimeScale,
  Filler,
  ChartOptions,
} from "chart.js";
import { Line, Bar, Doughnut, Pie, Radar, PolarArea } from "react-chartjs-2";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  Maximize2,
  Settings,
  RefreshCw,
  Play,
  Pause,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  TimeScale,
  Filler
);

interface ChartProps {
  type: "line" | "bar" | "doughnut" | "pie" | "radar" | "polar" | "area";
  data: any;
  className?: string;
  title?: string;
  subtitle?: string;
  aiInsights?: {
    trend: "up" | "down" | "stable";
    confidence: number;
    recommendation: string;
    anomalies?: Array<{
      point: number;
      value: number;
      reason: string;
    }>;
  };
  realTime?: boolean;
  interactive?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  animated?: boolean;
  gradient?: boolean;
  onDataPointClick?: (point: any) => void;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string;
}

export function Chart({
  type,
  data,
  className = "",
  title,
  subtitle,
  aiInsights,
  realTime = false,
  interactive = true,
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  showAxes = true,
  animated = true,
  gradient = false,
  onDataPointClick,
  onRefresh,
  loading = false,
  error,
}: ChartProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = React.useState<any>(null);

  // Real-time data fetching
  const { data: realTimeData, refetch } = useQuery({
    queryKey: ["chart-data", type, title],
    queryFn: async () => {
      const response = await fetch(
        `/api/charts/${type}?title=${encodeURIComponent(title || "")}`
      );
      return response.json();
    },
    enabled: realTime,
    refetchInterval: isPlaying ? 2000 : false,
  });

  // AI-powered data analysis
  const { data: aiAnalysis } = useQuery({
    queryKey: ["ai-analysis", type, data],
    queryFn: async () => {
      const response = await fetch("/api/ai/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      return response.json();
    },
    enabled: !!aiInsights,
  });

  const chartData = realTime && realTimeData ? realTimeData : data;

  // Enhanced chart options with animations and interactions
  const getChartOptions = (): ChartOptions<any> => {
    const baseOptions: ChartOptions<any> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: showLegend,
          position: "top" as const,
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          enabled: showTooltip,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "white",
          bodyColor: "white",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            afterBody: (context) => {
              if (aiInsights?.anomalies) {
                const pointIndex = context[0]?.dataIndex;
                const anomaly = aiInsights.anomalies.find(
                  (a) => a.point === pointIndex
                );
                if (anomaly) {
                  return [`⚠️ Anomaly detected: ${anomaly.reason}`];
                }
              }
              return [];
            },
          },
        },
      },
      scales: showAxes
        ? {
            x: {
              display: true,
              grid: {
                display: showGrid,
                color: "rgba(0, 0, 0, 0.1)",
              },
              ticks: {
                font: {
                  size: 11,
                },
              },
            },
            y: {
              display: true,
              grid: {
                display: showGrid,
                color: "rgba(0, 0, 0, 0.1)",
              },
              ticks: {
                font: {
                  size: 11,
                },
              },
            },
          }
        : {},
      onClick: (event, elements) => {
        if (onDataPointClick && elements.length > 0) {
          const element = elements[0];
          const dataPoint = {
            index: element.index,
            value:
              chartData.datasets[element.datasetIndex]?.data[element.index],
            label: chartData.labels[element.index],
          };
          setSelectedDataPoint(dataPoint);
          onDataPointClick(dataPoint);
        }
      },
    };

    // Add animations
    if (animated) {
      baseOptions.animation = {
        duration: 1000,
        easing: "easeInOutQuart",
        delay: (context) => {
          return context.type === "data" ? context.dataIndex * 100 : 0;
        },
      };
    }

    return baseOptions;
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="h-64 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
          />
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-64 flex items-center justify-center text-red-500">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      );
    }

    const options = getChartOptions();

    switch (type) {
      case "line":
        return <Line data={chartData} options={options} />;
      case "bar":
        return <Bar data={chartData} options={options} />;
      case "doughnut":
        return <Doughnut data={chartData} options={options} />;
      case "pie":
        return <Pie data={chartData} options={options} />;
      case "radar":
        return <Radar data={chartData} options={options} />;
      case "polar":
        return <PolarArea data={chartData} options={options} />;
      case "area":
        return <Line data={chartData} options={options} />;
      default:
        return <Line data={chartData} options={options} />;
    }
  };

  const getTrendIcon = () => {
    if (!aiInsights) return null;

    switch (aiInsights.trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (!aiInsights) return "text-gray-500";

    switch (aiInsights.trend) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Header */}
      {(title || subtitle || aiInsights) && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {title && (
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>

            {/* AI Insights Badge */}
            {aiInsights && (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="flex items-center space-x-1"
                    >
                      <Brain className="w-3 h-3" />
                      <span>AI</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs">
                      <p className="font-medium mb-1">AI Analysis</p>
                      <p className="text-sm">{aiInsights.recommendation}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {aiInsights.confidence}% confidence
                      </p>
                    </div>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Trend Indicator */}
          {aiInsights && (
            <div className="flex items-center space-x-2 mt-2">
              {getTrendIcon()}
              <span className={cn("text-sm font-medium", getTrendColor())}>
                {aiInsights.trend === "up"
                  ? "Rising"
                  : aiInsights.trend === "down"
                  ? "Falling"
                  : "Stable"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({aiInsights.confidence}% confidence)
              </span>
            </div>
          )}
        </CardHeader>
      )}

      {/* Chart Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        {realTime && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        )}

        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="p-2"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Chart Content */}
      <CardContent className="pt-0">
        <div className="h-64 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={realTime ? "realtime" : "static"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderChart()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Selected Data Point Info */}
        {selectedDataPoint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-muted rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{selectedDataPoint.label}</p>
                <p className="text-lg font-bold">{selectedDataPoint.value}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDataPoint(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Anomalies */}
        {aiInsights?.anomalies && aiInsights.anomalies.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
              Detected Anomalies
            </h4>
            <div className="space-y-2">
              {aiInsights.anomalies.map((anomaly, index) => (
                <div
                  key={index}
                  className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg"
                >
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Point {anomaly.point}: {anomaly.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-6xl h-full max-h-[90vh] bg-card rounded-lg shadow-2xl border border-border p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-[calc(100%-4rem)]">{renderChart()}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
