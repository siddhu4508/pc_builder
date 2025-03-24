import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { adminAPI } from '../../services/api';
import type { DashboardStats, AnalyticsData } from '../../services/api';
import InventoryManagement from './InventoryManagement';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, analyticsResponse] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getAnalytics()
      ]);
      setStats(statsResponse.data);
      setAnalytics(analyticsResponse.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!stats || !analytics) return <div>No data available</div>;

  const revenueData = {
    labels: analytics.revenue_by_month.map(item => item.month),
    datasets: [
      {
        label: 'Revenue',
        data: analytics.revenue_by_month.map(item => item.revenue),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const revenueOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Monthly Revenue',
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Components</h3>
          <p className="text-2xl font-bold">{stats.total_components}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Value</h3>
          <p className="text-2xl font-bold">${stats.total_value.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Low Stock Items</h3>
          <p className="text-2xl font-bold">{stats.low_stock_components}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Components by Category</h3>
          <div className="mt-2">
            {Object.entries(stats.components_by_category).map(([category, count]) => (
              <div key={category} className="flex justify-between text-sm">
                <span>{category}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <Line options={revenueOptions} data={revenueData} />
      </div>

      {/* Popular Components */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Popular Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analytics.popular_components.map((component, index) => (
            <div key={index} className="p-4 border rounded">
              <h3 className="font-medium">{component.name}</h3>
              <p className="text-gray-600">{component.count} builds</p>
            </div>
          ))}
        </div>
      </div>

      {/* Build Categories */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Build Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analytics.build_categories.map((category, index) => (
            <div key={index} className="p-4 border rounded">
              <h3 className="font-medium">{category.category}</h3>
              <p className="text-gray-600">{category.count} builds</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Additions */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Additions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.recent_additions.map((component) => (
            <div key={component.id} className="p-4 border rounded">
              <h3 className="font-medium">{component.name}</h3>
              <p className="text-gray-600">{component.category}</p>
              <p className="text-gray-800">${component.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Management */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Inventory Management</h2>
        <InventoryManagement />
      </div>
    </div>
  );
};

export default AdminDashboard; 