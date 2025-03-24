import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FaExclamationTriangle, FaBox, FaTruck } from 'react-icons/fa';

interface InventoryAlert {
  id: number;
  component_id: number;
  component_name: string;
  current_stock: number;
  reorder_point: number;
  status: 'low' | 'out' | 'reordered';
  created_at: string;
}

interface ReorderPoint {
  component_id: number;
  component_name: string;
  reorder_point: number;
  reorder_quantity: number;
}

const InventoryManagement: React.FC = () => {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [reorderPoints, setReorderPoints] = useState<ReorderPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ReorderPoint | null>(null);
  const [reorderQuantity, setReorderQuantity] = useState<number>(0);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const [alertsResponse, reorderPointsResponse] = await Promise.all([
        api.get('/admin/inventory/alerts/'),
        api.get('/admin/inventory/reorder-points/')
      ]);
      setAlerts(alertsResponse.data);
      setReorderPoints(reorderPointsResponse.data);
    } catch (err) {
      setError('Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComponent || !reorderQuantity) return;

    try {
      await api.post('/admin/inventory/reorder/', {
        component_id: selectedComponent.component_id,
        quantity: reorderQuantity
      });
      fetchInventoryData();
      setShowReorderModal(false);
      setSelectedComponent(null);
      setReorderQuantity(0);
    } catch (err) {
      setError('Failed to place reorder');
    }
  };

  const handleUpdateReorderPoint = async (componentId: number, newPoint: number) => {
    try {
      await api.patch(`/admin/inventory/reorder-points/${componentId}/`, {
        reorder_point: newPoint
      });
      fetchInventoryData();
    } catch (err) {
      setError('Failed to update reorder point');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Inventory Alerts */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FaExclamationTriangle className="text-yellow-500" />
            Inventory Alerts
          </h3>
        </div>
        <div className="divide-y">
          {alerts.map(alert => (
            <div key={alert.id} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium">{alert.component_name}</h4>
                <p className="text-sm text-gray-600">
                  Current Stock: {alert.current_stock} | Reorder Point: {alert.reorder_point}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  alert.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                  alert.status === 'out' ? 'bg-red-100 text-red-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                </span>
                {alert.status !== 'reordered' && (
                  <button
                    onClick={() => {
                      setSelectedComponent({
                        component_id: alert.component_id,
                        component_name: alert.component_name,
                        reorder_point: alert.reorder_point,
                        reorder_quantity: alert.reorder_point * 2
                      });
                      setShowReorderModal(true);
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Reorder
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reorder Points */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FaBox className="text-blue-500" />
            Reorder Points
          </h3>
        </div>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Component
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reorder Point
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reorder Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reorderPoints.map(point => (
              <tr key={point.component_id}>
                <td className="px-6 py-4 whitespace-nowrap">{point.component_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={point.reorder_point}
                    onChange={(e) => handleUpdateReorderPoint(point.component_id, Number(e.target.value))}
                    className="w-24 p-1 border rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{point.reorder_quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => {
                      setSelectedComponent(point);
                      setShowReorderModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Reorder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reorder Modal */}
      {showReorderModal && selectedComponent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Place Reorder</h2>
            <form onSubmit={handleReorder}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Component</label>
                <p className="text-gray-600">{selectedComponent.component_name}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reorder Quantity</label>
                <input
                  type="number"
                  value={reorderQuantity}
                  onChange={(e) => setReorderQuantity(Number(e.target.value))}
                  min={1}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowReorderModal(false);
                    setSelectedComponent(null);
                    setReorderQuantity(0);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Place Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement; 