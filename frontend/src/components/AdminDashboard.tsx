import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { api } from '../services/api';
import { DebounceInput } from 'react-debounce-input';
import { FaSearch, FaFilter, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import InventoryManagement from './admin/InventoryManagement';
import AnalyticsDashboard from './AnalyticsDashboard';
import AppsManagement from './admin/AppsManagement';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Component {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
  stock: number;
  created_at: string;
  updated_at: string;
  // CPU Specifications
  cpu_socket?: string;
  cpu_cores?: number;
  cpu_threads?: number;
  cpu_base_clock?: number;
  cpu_boost_clock?: number;
  cpu_tdp?: number;
  // Motherboard Specifications
  motherboard_socket?: string;
  motherboard_form_factor?: string;
  motherboard_chipset?: string;
  motherboard_memory_slots?: number;
  motherboard_max_memory?: number;
  motherboard_memory_type?: string;
  // RAM Specifications
  ram_type?: string;
  ram_speed?: number;
  ram_capacity?: number;
  ram_channels?: number;
  ram_timings?: string;
  // GPU Specifications
  gpu_chipset?: string;
  gpu_memory?: number;
  gpu_memory_type?: string;
  gpu_length?: number;
  gpu_tdp?: number;
  gpu_ports?: string[];
  // Storage Specifications
  storage_type?: string;
  storage_capacity?: number;
  storage_interface?: string;
  storage_read_speed?: number;
  storage_write_speed?: number;
  // PSU Specifications
  psu_wattage?: number;
  psu_efficiency?: string;
  psu_modular?: string;
  psu_form_factor?: string;
  // Case Specifications
  case_form_factor?: string;
  case_color?: string;
  case_material?: string;
  case_max_gpu_length?: number;
  case_max_cpu_cooler_height?: number;
  case_fans_included?: number;
  case_fan_sizes?: number[];
  // Cooling Specifications
  cooling_type?: string;
  cooling_socket_support?: string[];
  cooling_fan_speed?: { min: number; max: number };
  cooling_noise_level?: number;
  cooling_height?: number;
}

interface DashboardStats {
  total_components: number;
  total_value: number;
  components_by_category: Record<string, number>;
  low_stock_components: number;
  recent_additions: Component[];
}

interface PriceHistory {
  price: number;
  recorded_at: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  date_joined: string;
}

const SPECIFICATION_FIELDS = {
  CPU: [
    { name: 'cpu_socket', label: 'Socket', type: 'text' },
    { name: 'cpu_cores', label: 'Cores', type: 'number' },
    { name: 'cpu_threads', label: 'Threads', type: 'number' },
    { name: 'cpu_base_clock', label: 'Base Clock (GHz)', type: 'number', step: '0.1' },
    { name: 'cpu_boost_clock', label: 'Boost Clock (GHz)', type: 'number', step: '0.1' },
    { name: 'cpu_tdp', label: 'TDP (W)', type: 'number' },
  ],
  Motherboard: [
    { name: 'motherboard_socket', label: 'Socket', type: 'text' },
    { name: 'motherboard_form_factor', label: 'Form Factor', type: 'text' },
    { name: 'motherboard_chipset', label: 'Chipset', type: 'text' },
    { name: 'motherboard_memory_slots', label: 'Memory Slots', type: 'number' },
    { name: 'motherboard_max_memory', label: 'Max Memory (GB)', type: 'number' },
    { name: 'motherboard_memory_type', label: 'Memory Type', type: 'text' },
  ],
  RAM: [
    { name: 'ram_type', label: 'Type', type: 'text' },
    { name: 'ram_speed', label: 'Speed (MHz)', type: 'number' },
    { name: 'ram_capacity', label: 'Capacity (GB)', type: 'number' },
    { name: 'ram_channels', label: 'Channels', type: 'number' },
    { name: 'ram_timings', label: 'Timings', type: 'text' },
  ],
  GPU: [
    { name: 'gpu_chipset', label: 'Chipset', type: 'text' },
    { name: 'gpu_memory', label: 'Memory (GB)', type: 'number' },
    { name: 'gpu_memory_type', label: 'Memory Type', type: 'text' },
    { name: 'gpu_length', label: 'Length (mm)', type: 'number' },
    { name: 'gpu_tdp', label: 'TDP (W)', type: 'number' },
  ],
  Storage: [
    { name: 'storage_type', label: 'Type', type: 'text' },
    { name: 'storage_capacity', label: 'Capacity (GB)', type: 'number' },
    { name: 'storage_interface', label: 'Interface', type: 'text' },
    { name: 'storage_read_speed', label: 'Read Speed (MB/s)', type: 'number' },
    { name: 'storage_write_speed', label: 'Write Speed (MB/s)', type: 'number' },
  ],
  PSU: [
    { name: 'psu_wattage', label: 'Wattage', type: 'number' },
    { name: 'psu_efficiency', label: 'Efficiency Rating', type: 'text' },
    { name: 'psu_modular', label: 'Modular Type', type: 'text' },
    { name: 'psu_form_factor', label: 'Form Factor', type: 'text' },
  ],
  Case: [
    { name: 'case_form_factor', label: 'Form Factor', type: 'text' },
    { name: 'case_color', label: 'Color', type: 'text' },
    { name: 'case_material', label: 'Material', type: 'text' },
    { name: 'case_max_gpu_length', label: 'Max GPU Length (mm)', type: 'number' },
    { name: 'case_max_cpu_cooler_height', label: 'Max CPU Cooler Height (mm)', type: 'number' },
    { name: 'case_fans_included', label: 'Fans Included', type: 'number' },
  ],
  Cooling: [
    { name: 'cooling_type', label: 'Type', type: 'text' },
    { name: 'cooling_socket_support', label: 'Socket Support', type: 'text' },
    { name: 'cooling_fan_speed', label: 'Fan Speed (RPM)', type: 'text' },
    { name: 'cooling_noise_level', label: 'Noise Level (dB)', type: 'number' },
    { name: 'cooling_height', label: 'Height (mm)', type: 'number' },
  ],
};

interface FilterState {
  category: string;
  priceRange: { min: number; max: number };
  stockRange: { min: number; max: number };
  searchQuery: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

const AdminDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [showEditComponent, setShowEditComponent] = useState(false);
  const [showCompareComponents, setShowCompareComponents] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<number[]>([]);
  const [newComponent, setNewComponent] = useState<Partial<Component>>({
    category: 'CPU'
  });
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [showPriceHistory, setShowPriceHistory] = useState(false);
  const [selectedComponentForHistory, setSelectedComponentForHistory] = useState<Component | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    priceRange: { min: 0, max: Infinity },
    stockRange: { min: 0, max: Infinity },
    searchQuery: '',
    sortField: 'name',
    sortDirection: 'asc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, componentsResponse, usersResponse] = await Promise.all([
        api.get('/admin/dashboard/stats/'),
        api.get('/components/'),
        api.get('/admin/users/')
      ]);
      setStats(statsResponse.data);
      setComponents(componentsResponse.data);
      setUsers(usersResponse.data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/components/', newComponent);
      fetchDashboardData();
      setShowAddComponent(false);
      setNewComponent({ category: 'CPU' });
    } catch (err) {
      setError('Failed to add component');
    }
  };

  const handleEditComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComponent) return;
    try {
      await api.put(`/components/${editingComponent.id}/`, editingComponent);
      fetchDashboardData();
      setShowEditComponent(false);
      setEditingComponent(null);
    } catch (err) {
      setError('Failed to update component');
    }
  };

  const handleDeleteComponent = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this component?')) return;
    try {
      await api.delete(`/components/${id}/`);
      fetchDashboardData();
    } catch (err) {
      setError('Failed to delete component');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) return;
    const formData = new FormData();
    formData.append('file', bulkFile);
    try {
      await api.post('/components/bulk-import/', formData);
      fetchDashboardData();
      setBulkFile(null);
    } catch (err) {
      setError('Failed to import components');
    }
  };

  const handleBulkExport = async () => {
    try {
      const response = await api.get('/components/bulk-export/', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'components.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export components');
    }
  };

  const handlePriceHistory = async (component: Component) => {
    try {
      const response = await api.get(`/components/${component.id}/price-history/`);
      setPriceHistory(response.data);
      setSelectedComponentForHistory(component);
      setShowPriceHistory(true);
    } catch (err) {
      setError('Failed to fetch price history');
    }
  };

  const handleCompareComponents = () => {
    if (selectedComponents.length !== 2) {
      setError('Please select exactly 2 components to compare');
      return;
    }
    setShowCompareComponents(true);
  };

  const handleUserRoleChange = async (userId: number, isStaff: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/`, { is_staff: isStaff });
      fetchDashboardData();
    } catch (err) {
      setError('Failed to update user role');
    }
  };

  const getFilteredComponents = () => {
    return components
      .filter(component => {
        const matchesCategory = !filters.category || component.category === filters.category;
        const matchesPrice = component.price >= filters.priceRange.min && 
                           component.price <= filters.priceRange.max;
        const matchesStock = component.stock >= filters.stockRange.min && 
                           component.stock <= filters.stockRange.max;
        const matchesSearch = !filters.searchQuery || 
                            component.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                            component.description.toLowerCase().includes(filters.searchQuery.toLowerCase());
        
        return matchesCategory && matchesPrice && matchesStock && matchesSearch;
      })
      .sort((a, b) => {
        const aValue = a[filters.sortField as keyof Component];
        const bValue = b[filters.sortField as keyof Component];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return filters.sortDirection === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return filters.sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
  };

  const handleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sortField: field,
      sortDirection: prev.sortField === field && prev.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderSortIcon = (field: string) => {
    if (filters.sortField !== field) return <FaSort className="inline ml-1" />;
    return filters.sortDirection === 'asc' 
      ? <FaSortUp className="inline ml-1" />
      : <FaSortDown className="inline ml-1" />;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!stats) return <div>No data available</div>;

  const priceChartData = {
    labels: components.map(c => c.name),
    datasets: [{
      label: 'Component Prices',
      data: components.map(c => c.price),
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  };

  const categoryChartData = {
    labels: Object.keys(stats.components_by_category),
    datasets: [{
      data: Object.values(stats.components_by_category),
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)'
      ]
    }]
  };

  const priceHistoryChartData = {
    labels: priceHistory.map(h => new Date(h.recorded_at).toLocaleDateString()),
    datasets: [{
      label: 'Price History',
      data: priceHistory.map(h => h.price),
      borderColor: 'rgba(75, 192, 192, 1)',
      tension: 0.1
    }]
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('apps')}
            className={`${
              activeTab === 'apps'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Apps
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'inventory' && <InventoryManagement />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'apps' && <AppsManagement />}
      </div>
    </div>
  );
};

export default AdminDashboard; 