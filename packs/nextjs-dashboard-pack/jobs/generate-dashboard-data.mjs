export default {
  meta: {
    name: "generate-dashboard-data",
    desc: "Generates realistic mock data for dashboard components and charts",
  },
  async run(ctx) {
    const { payload } = ctx;

    const dataType = payload?.data_type || "all";
    const recordCount = payload?.record_count || 100;
    const includeTimeSeries = payload?.include_timeseries !== false;

    console.log(`📊 Generating dashboard data: ${dataType}`);
    console.log(`📈 Record count: ${recordCount}`);
    console.log(`⏰ Include time series: ${includeTimeSeries ? "Yes" : "No"}`);

    try {
      const fs = await import("fs/promises");
      const path = await import("path");

      // Create data directory if it doesn't exist
      await fs.mkdir("src/data", { recursive: true });

      let generatedData = {};

      // Generate different types of data
      if (dataType === "all" || dataType === "users") {
        generatedData.users = generateUserData(recordCount);
      }

      if (dataType === "all" || dataType === "analytics") {
        generatedData.analytics = generateAnalyticsData(recordCount);
      }

      if (dataType === "all" || dataType === "sales") {
        generatedData.sales = generateSalesData(recordCount);
      }

      if (dataType === "all" || dataType === "charts") {
        generatedData.charts = generateChartData(includeTimeSeries);
      }

      if (dataType === "all" || dataType === "metrics") {
        generatedData.metrics = generateMetricsData();
      }

      // Write data to file
      const dataContent = `// Generated dashboard data
// Generated at: ${new Date().toISOString()}

export const mockData = ${JSON.stringify(generatedData, null, 2)};

// Individual data exports for easy importing
${Object.entries(generatedData)
  .map(([key, value]) => `export const ${key}Data = mockData.${key};`)
  .join("\n")}

// Utility functions
export function getRandomItem(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

export function getRandomItems(array: any[], count: number) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function generateTimeSeriesData(days: number = 30) {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 1000) + 100,
      users: Math.floor(Math.random() * 500) + 50,
      revenue: Math.floor(Math.random() * 10000) + 1000,
    });
  }
  
  return data;
}`;

      const outputPath = path.join("src/data", "mockData.ts");
      await fs.writeFile(outputPath, dataContent);

      console.log(`✅ Generated dashboard data`);
      console.log(`📁 Location: ${outputPath}`);
      console.log(`📊 Data types: ${Object.keys(generatedData).join(", ")}`);

      return {
        status: "success",
        message: `Dashboard data generated successfully.`,
        data: {
          dataType,
          recordCount,
          includeTimeSeries,
          outputPath,
          dataTypes: Object.keys(generatedData),
        },
      };
    } catch (error) {
      console.error("❌ Error generating data:", error.message);
      return {
        status: "error",
        message: `Failed to generate data: ${error.message}`,
        error: error.message,
      };
    }
  },
};

function generateUserData(count) {
  const names = [
    "John Doe",
    "Jane Smith",
    "Bob Johnson",
    "Alice Brown",
    "Charlie Wilson",
    "Diana Davis",
    "Eve Miller",
    "Frank Garcia",
    "Grace Lee",
    "Henry Taylor",
    "Ivy Chen",
    "Jack Anderson",
    "Kate White",
    "Liam Martinez",
    "Maya Patel",
  ];

  const roles = ["Admin", "User", "Moderator", "Editor", "Viewer"];
  const statuses = ["Active", "Inactive", "Pending", "Suspended"];
  const departments = ["Engineering", "Marketing", "Sales", "Support", "HR"];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: names[Math.floor(Math.random() * names.length)],
    email: `user${i + 1}@example.com`,
    role: roles[Math.floor(Math.random() * roles.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    department: departments[Math.floor(Math.random() * departments.length)],
    lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
  }));
}

function generateAnalyticsData(count) {
  const pages = ["/dashboard", "/analytics", "/users", "/settings", "/profile"];
  const browsers = ["Chrome", "Firefox", "Safari", "Edge"];
  const devices = ["Desktop", "Mobile", "Tablet"];
  const countries = ["US", "CA", "UK", "DE", "FR", "JP", "AU"];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    page: pages[Math.floor(Math.random() * pages.length)],
    views: Math.floor(Math.random() * 1000) + 10,
    uniqueViews: Math.floor(Math.random() * 500) + 5,
    bounceRate: Math.random() * 100,
    avgTimeOnPage: Math.floor(Math.random() * 300) + 30,
    browser: browsers[Math.floor(Math.random() * browsers.length)],
    device: devices[Math.floor(Math.random() * devices.length)],
    country: countries[Math.floor(Math.random() * countries.length)],
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  }));
}

function generateSalesData(count) {
  const products = [
    "Product A",
    "Product B",
    "Product C",
    "Product D",
    "Product E",
  ];
  const categories = ["Electronics", "Clothing", "Books", "Home", "Sports"];
  const regions = ["North", "South", "East", "West", "Central"];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    product: products[Math.floor(Math.random() * products.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    price: Math.floor(Math.random() * 500) + 10,
    quantity: Math.floor(Math.random() * 10) + 1,
    revenue: Math.floor(Math.random() * 5000) + 100,
    region: regions[Math.floor(Math.random() * regions.length)],
    customerId: Math.floor(Math.random() * 1000) + 1,
    date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  }));
}

function generateChartData(includeTimeSeries) {
  const data = {
    revenue: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "Revenue",
          data: [12000, 19000, 3000, 5000, 2000, 3000],
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
        },
      ],
    },
    users: {
      labels: ["Desktop", "Mobile", "Tablet"],
      datasets: [
        {
          data: [65, 25, 10],
          backgroundColor: [
            "rgb(59, 130, 246)",
            "rgb(16, 185, 129)",
            "rgb(245, 158, 11)",
          ],
        },
      ],
    },
    traffic: {
      labels: ["Direct", "Social", "Email", "Referral", "Organic"],
      datasets: [
        {
          label: "Traffic Sources",
          data: [40, 20, 15, 15, 10],
          backgroundColor: [
            "rgb(59, 130, 246)",
            "rgb(16, 185, 129)",
            "rgb(245, 158, 11)",
            "rgb(239, 68, 68)",
            "rgb(139, 92, 246)",
          ],
        },
      ],
    },
  };

  if (includeTimeSeries) {
    data.timeSeries = generateTimeSeriesData();
  }

  return data;
}

function generateMetricsData() {
  return {
    totalUsers: Math.floor(Math.random() * 10000) + 1000,
    totalRevenue: Math.floor(Math.random() * 100000) + 10000,
    totalOrders: Math.floor(Math.random() * 5000) + 500,
    conversionRate: Math.random() * 10 + 1,
    avgOrderValue: Math.floor(Math.random() * 200) + 50,
    customerSatisfaction: Math.random() * 2 + 3, // 3-5 stars
    monthlyGrowth: Math.random() * 20 - 5, // -5% to +15%
    churnRate: Math.random() * 5 + 1, // 1-6%
  };
}

function generateTimeSeriesData(days = 30) {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    data.push({
      date: date.toISOString().split("T")[0],
      value: Math.floor(Math.random() * 1000) + 100,
      users: Math.floor(Math.random() * 500) + 50,
      revenue: Math.floor(Math.random() * 10000) + 1000,
    });
  }

  return data;
}

