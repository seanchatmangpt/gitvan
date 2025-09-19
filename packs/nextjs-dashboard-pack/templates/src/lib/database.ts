import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { join } from "path";

// Types for our data structure
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "moderator";
  status: "active" | "inactive" | "pending";
  lastLogin: string;
  createdAt: string;
}

export interface AnalyticsData {
  date: string;
  users: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  conversionRate: number;
}

export interface SalesData {
  id: string;
  product: string;
  amount: number;
  quantity: number;
  customer: string;
  date: string;
  status: "completed" | "pending" | "cancelled";
}

export interface MetricsData {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyGrowth: number;
  conversionRate: number;
  averageSessionDuration: number;
  topPages: Array<{ page: string; views: number }>;
  topReferrers: Array<{ source: string; visits: number }>;
}

export interface DatabaseSchema {
  users: User[];
  analytics: AnalyticsData[];
  sales: SalesData[];
  metrics: MetricsData;
  settings: Record<string, any>;
}

class LocalDatabase {
  private db: Low<DatabaseSchema>;
  private initialized = false;

  constructor() {
    const file = join(process.cwd(), "data", "db.json");
    const adapter = new JSONFile<DatabaseSchema>(file);
    this.db = new Low(adapter, {
      users: [],
      analytics: [],
      sales: [],
      metrics: {
        totalUsers: 0,
        activeUsers: 0,
        totalRevenue: 0,
        monthlyGrowth: 0,
        conversionRate: 0,
        averageSessionDuration: 0,
        topPages: [],
        topReferrers: [],
      },
      settings: {},
    });
  }

  async initialize() {
    if (this.initialized) return;

    await this.db.read();

    // Initialize with sample data if empty
    if (this.db.data.users.length === 0) {
      await this.seedData();
    }

    this.initialized = true;
  }

  private async seedData() {
    const users: User[] = Array.from({ length: 100 }, (_, i) => ({
      id: `user-${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: ["admin", "user", "moderator"][i % 3] as User["role"],
      status: ["active", "inactive", "pending"][i % 3] as User["status"],
      lastLogin: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      createdAt: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
    }));

    const analytics: AnalyticsData[] = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      users: Math.floor(Math.random() * 1000) + 500,
      sessions: Math.floor(Math.random() * 2000) + 1000,
      pageViews: Math.floor(Math.random() * 5000) + 2000,
      bounceRate: Math.random() * 0.3 + 0.2,
      conversionRate: Math.random() * 0.1 + 0.05,
    }));

    const sales: SalesData[] = Array.from({ length: 50 }, (_, i) => ({
      id: `sale-${i + 1}`,
      product: `Product ${i + 1}`,
      amount: Math.floor(Math.random() * 1000) + 100,
      quantity: Math.floor(Math.random() * 10) + 1,
      customer: `Customer ${i + 1}`,
      date: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      status: ["completed", "pending", "cancelled"][
        i % 3
      ] as SalesData["status"],
    }));

    const metrics: MetricsData = {
      totalUsers: 1250,
      activeUsers: 890,
      totalRevenue: 45678,
      monthlyGrowth: 12.5,
      conversionRate: 8.3,
      averageSessionDuration: 245,
      topPages: [
        { page: "/dashboard", views: 1250 },
        { page: "/analytics", views: 980 },
        { page: "/users", views: 750 },
        { page: "/settings", views: 420 },
        { page: "/profile", views: 380 },
      ],
      topReferrers: [
        { source: "Google", visits: 1250 },
        { source: "Direct", visits: 980 },
        { source: "Social Media", visits: 750 },
        { source: "Email", visits: 420 },
        { source: "Other", visits: 380 },
      ],
    };

    this.db.data = {
      users,
      analytics,
      sales,
      metrics,
      settings: {},
    };

    await this.db.write();
  }

  // User operations
  async getUsers(): Promise<User[]> {
    await this.initialize();
    return this.db.data.users;
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.initialize();
    return this.db.data.users.find((user) => user.id === id);
  }

  async createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    await this.initialize();
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.db.data.users.push(newUser);
    await this.db.write();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    await this.initialize();
    const userIndex = this.db.data.users.findIndex((user) => user.id === id);
    if (userIndex === -1) return null;

    this.db.data.users[userIndex] = {
      ...this.db.data.users[userIndex],
      ...updates,
    };
    await this.db.write();
    return this.db.data.users[userIndex];
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.initialize();
    const userIndex = this.db.data.users.findIndex((user) => user.id === id);
    if (userIndex === -1) return false;

    this.db.data.users.splice(userIndex, 1);
    await this.db.write();
    return true;
  }

  // Analytics operations
  async getAnalytics(): Promise<AnalyticsData[]> {
    await this.initialize();
    return this.db.data.analytics;
  }

  async addAnalyticsData(data: AnalyticsData): Promise<void> {
    await this.initialize();
    this.db.data.analytics.push(data);
    await this.db.write();
  }

  // Sales operations
  async getSales(): Promise<SalesData[]> {
    await this.initialize();
    return this.db.data.sales;
  }

  async addSale(sale: Omit<SalesData, "id">): Promise<SalesData> {
    await this.initialize();
    const newSale: SalesData = {
      ...sale,
      id: `sale-${Date.now()}`,
    };
    this.db.data.sales.push(newSale);
    await this.db.write();
    return newSale;
  }

  // Metrics operations
  async getMetrics(): Promise<MetricsData> {
    await this.initialize();
    return this.db.data.metrics;
  }

  async updateMetrics(updates: Partial<MetricsData>): Promise<MetricsData> {
    await this.initialize();
    this.db.data.metrics = { ...this.db.data.metrics, ...updates };
    await this.db.write();
    return this.db.data.metrics;
  }

  // Settings operations
  async getSettings(): Promise<Record<string, any>> {
    await this.initialize();
    return this.db.data.settings;
  }

  async updateSettings(updates: Record<string, any>): Promise<void> {
    await this.initialize();
    this.db.data.settings = { ...this.db.data.settings, ...updates };
    await this.db.write();
  }
}

// Export singleton instance
export const db = new LocalDatabase();

