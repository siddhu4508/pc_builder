import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
}

export interface Component {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image_url: string;
  reorder_point?: number;
  reorder_quantity?: number;
}

export interface InventoryAlert {
  id: number;
  component: Component;
  message: string;
  created_at: string;
  resolved: boolean;
}

export interface Reorder {
  id: number;
  component: Component;
  quantity: number;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
  created_at: string;
}

export interface StockHistory {
  id: number;
  component: Component;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  created_at: string;
}

export interface DashboardStats {
  total_components: number;
  total_value: number;
  components_by_category: Record<string, number>;
  low_stock_components: number;
  recent_additions: Component[];
}

export interface AnalyticsData {
  revenue_by_month: { month: string; revenue: number }[];
  popular_components: { name: string; count: number }[];
  build_categories: { category: string; count: number }[];
}

// API Endpoints
export const authAPI = {
  login: (credentials: LoginCredentials) =>
    api.post<{ access: string; refresh: string }>('/api/token/', credentials),
  refreshToken: (refresh: string) =>
    api.post<{ access: string }>('/api/token/refresh/', { refresh }),
};

export const componentsAPI = {
  getAll: () => api.get<Component[]>('/api/components/'),
  getById: (id: number) => api.get<Component>(`/api/components/${id}/`),
  create: (data: Omit<Component, 'id'>) => api.post<Component>('/api/components/', data),
  update: (id: number, data: Partial<Component>) => api.put<Component>(`/api/components/${id}/`, data),
  delete: (id: number) => api.delete(`/api/components/${id}/`),
  byCategory: (category: string) => api.get<Component[]>(`/api/components/by_category/?category=${category}`),
  lowStock: () => api.get<Component[]>('/api/components/low_stock/'),
  recent: () => api.get<Component[]>('/api/components/recent/'),
};

export const adminAPI = {
  getDashboardStats: () => api.get<DashboardStats>('/api/admin/dashboard/'),
  getAnalytics: () => api.get<AnalyticsData>('/api/admin/analytics/'),
  getInventory: () => api.get<{
    alerts: InventoryAlert[];
    reorder_points: Array<{
      id: number;
      name: string;
      stock: number;
      reorder_point: number;
      reorder_quantity: number;
    }>;
  }>('/api/admin/inventory/'),
  updateInventory: (id: number, data: { stock: number }) => 
    api.put<Component>(`/api/admin/inventory/${id}/`, data),
  reorder: (data: { component_id: number; quantity: number }) =>
    api.post<Reorder>('/api/admin/inventory/reorder/', data),
  getStockHistory: () => api.get<StockHistory[]>('/api/admin/inventory/stock_history/'),
  getReorderStatus: () => api.get<Reorder[]>('/api/admin/inventory/reorder_status/'),
  updateReorderStatus: (data: { reorder_id: number; status: Reorder['status'] }) =>
    api.post<Reorder>('/api/admin/inventory/update_reorder_status/', data),
  getInventoryReport: (format: 'pdf' | 'excel') =>
    api.get(`/api/admin/inventory/inventory_report/?format=${format}`, {
      responseType: 'blob'
    }),
};

export default api; 