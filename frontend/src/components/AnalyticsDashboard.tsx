import React, { useState, useEffect } from 'react';
import { adminAPI, authAPI, componentsAPI } from '../services/api';
import {
  Line,
  Bar,
  Pie,
  Scatter
} from 'react-chartjs-2';
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
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { FaDownload, FaChartLine, FaChartBar, FaChartPie } from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface SalesData {
  date: string;
  total_sales: number;
  total_orders: number;
}

interface ComponentSales {
  component_id: number;
  component_name: string;
  total_sales: number;
  quantity_sold: number;
}

interface CategoryDistribution {
  category: string;
  count: number;
  total_value: number;
}

interface InventoryReport {
  total_components: number;
  total_value: number;
  low_stock: number;
  out_of_stock: number;
  components_by_category: CategoryDistribution[];
}

const AnalyticsDashboard: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topComponents, setTopComponents] = useState<ComponentSales[]>([]);
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      const [salesResponse, componentsResponse, inventoryResponse] = await Promise.all([
        adminAPI.get(`/analytics/sales/?range=${dateRange}`),
        adminAPI.get('/analytics/top-components/'),
        adminAPI.get('/inventory/report/')
      ]);
      setSalesData(salesResponse.data);
      setTopComponents(componentsResponse.data);
      setInventoryReport(inventoryResponse.data);
    } catch (err) {
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await api.get(`/admin/analytics/export/?format=${format}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export report');
    }
  };

  if (loading) return <div>Loading...</div>;

  const salesChartData = {
    labels: salesData.map(d => new Date(d.date)),
    datasets: [
      {
        label: 'Total Sales',
        data: salesData.map(d => d.total_sales),
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1
      },
      {
        label: 'Number of Orders',
        data: salesData.map(d => d.total_orders),
        borderColor: 'rgba(255, 99, 132, 1)',
        tension: 0.1
      }
    ]
  };

  const topComponentsChartData = {
    labels: topComponents.map(c => c.component_name),
    datasets: [
      {
        label: 'Total Sales',
        data: topComponents.map(c => c.total_sales),
        backgroundColor: 'rgba(75, 192, 192, 0.5)'
      }
    ]
  };

  const categoryDistributionData = {
    labels: inventoryReport?.components_by_category.map(c => c.category) || [],
    datasets: [
      {
        data: inventoryReport?.components_by_category.map(c => c.total_value) || [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)'
        ]
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'year')}
            className="border rounded p-2"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
          <button
            onClick={() => handleExportReport('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            <FaDownload />
            Export PDF
          </button>
          <button
            onClick={() => handleExportReport('excel')}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <FaDownload />
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold">Total Components</h3>
          <p className="text-2xl">{inventoryReport?.total_components}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold">Total Value</h3>
          <p className="text-2xl">₹{inventoryReport?.total_value.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold">Low Stock Items</h3>
          <p className="text-2xl">{inventoryReport?.low_stock}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold">Out of Stock</h3>
          <p className="text-2xl">{inventoryReport?.out_of_stock}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaChartLine />
            Sales Trend
          </h3>
          <Line
            data={salesChartData}
            options={{
              scales: {
                x: {
                  type: 'time',
                  time: {
                    unit: dateRange === 'week' ? 'day' : dateRange === 'month' ? 'week' : 'month'
                  }
                }
              }
            }}
          />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaChartBar />
            Top Selling Components
          </h3>
          <Bar data={topComponentsChartData} />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaChartPie />
            Category Distribution
          </h3>
          <Pie data={categoryDistributionData} />
        </div>
      </div>

      {/* Detailed Reports */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Category-wise Breakdown</h3>
        </div>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventoryReport?.components_by_category.map(category => (
              <tr key={category.category}>
                <td className="px-6 py-4 whitespace-nowrap">{category.category}</td>
                <td className="px-6 py-4 whitespace-nowrap">{category.count}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  ₹{category.total_value.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 