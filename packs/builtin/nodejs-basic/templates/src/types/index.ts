{% if use_typescript %}// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  uptime: number;
  environment: string;
  memory: {
    used: number;
    total: number;
    unit: string;
  };
  version: string;
}

export interface DetailedHealthResponse extends HealthResponse {
  node_version: string;
  platform: string;
  arch: string;
  cpu: NodeJS.CpuUsage;
  pid: number;
}

// Request/Response extensions
declare global {
  namespace Express {
    interface Request {
      user?: any; // Add user type when implementing authentication
    }
  }
}

export {};{% endif %}