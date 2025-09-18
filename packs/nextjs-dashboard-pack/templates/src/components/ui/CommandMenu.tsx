import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Command,
  ArrowRight,
  FileText,
  BarChart3,
  Users,
  Settings,
  Calculator,
  Calendar,
  Mail,
  MessageSquare,
  Zap,
  Brain,
  Target,
  TrendingUp,
  Activity,
  Database,
  Cloud,
  Shield,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/Dialog";

interface CommandMenuProps {
  className?: string;
}

export function CommandMenu({ className = "" }: CommandMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  // AI-powered search suggestions
  const { data: suggestions } = useQuery({
    queryKey: ["command-suggestions", query],
    queryFn: async () => {
      if (!query) return [];
      const response = await fetch(
        `/api/ai/suggestions?q=${encodeURIComponent(query)}`
      );
      return response.json();
    },
    enabled: query.length > 0,
  });

  const commands = [
    {
      name: "Dashboard",
      description: "Go to main dashboard",
      icon: BarChart3,
      action: () => router.push("/dashboard"),
      keywords: ["dashboard", "home", "overview"],
    },
    {
      name: "Analytics",
      description: "View analytics and reports",
      icon: TrendingUp,
      action: () => router.push("/dashboard/analytics"),
      keywords: ["analytics", "reports", "data", "charts"],
    },
    {
      name: "Users",
      description: "Manage users and permissions",
      icon: Users,
      action: () => router.push("/dashboard/users"),
      keywords: ["users", "people", "accounts", "permissions"],
    },
    {
      name: "Settings",
      description: "Configure system settings",
      icon: Settings,
      action: () => router.push("/dashboard/settings"),
      keywords: ["settings", "config", "preferences"],
    },
    {
      name: "AI Insights",
      description: "View AI-powered insights",
      icon: Brain,
      action: () => router.push("/dashboard/ai-insights"),
      keywords: ["ai", "insights", "recommendations", "smart"],
    },
  ];

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredCommands = commands.filter(
    (command) =>
      command.name.toLowerCase().includes(query.toLowerCase()) ||
      command.description.toLowerCase().includes(query.toLowerCase()) ||
      command.keywords.some((keyword) => keyword.includes(query.toLowerCase()))
  );

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Search or type a command...
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
          <Command className="h-3 w-3" />K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-lg">
          <CommandPrimitive className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandPrimitive.Input
                placeholder="Search or type a command..."
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                value={query}
                onValueChange={setQuery}
              />
            </div>

            <CommandPrimitive.List className="max-h-[300px] overflow-y-auto overflow-x-hidden">
              <CommandPrimitive.Empty className="py-6 text-center text-sm">
                No results found.
              </CommandPrimitive.Empty>

              {filteredCommands.map((command) => {
                const Icon = command.icon;
                return (
                  <CommandPrimitive.Item
                    key={command.name}
                    value={command.name}
                    onSelect={() => {
                      command.action();
                      setOpen(false);
                    }}
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex-1">
                      <div className="font-medium">{command.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {command.description}
                      </div>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </CommandPrimitive.Item>
                );
              })}

              {/* AI Suggestions */}
              {suggestions && suggestions.length > 0 && (
                <>
                  <CommandPrimitive.Separator className="h-px bg-border" />
                  <CommandPrimitive.Group heading="AI Suggestions">
                    {suggestions.map((suggestion: any) => (
                      <CommandPrimitive.Item
                        key={suggestion.id}
                        value={suggestion.title}
                        onSelect={() => {
                          suggestion.action();
                          setOpen(false);
                        }}
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      >
                        <Brain className="mr-2 h-4 w-4 text-purple-500" />
                        <div className="flex-1">
                          <div className="font-medium">{suggestion.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {suggestion.description}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          AI
                        </Badge>
                      </CommandPrimitive.Item>
                    ))}
                  </CommandPrimitive.Group>
                </>
              )}
            </CommandPrimitive.List>
          </CommandPrimitive>
        </DialogContent>
      </Dialog>
    </>
  );
}
