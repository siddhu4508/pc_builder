import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import type { Component, InventoryAlert, Reorder } from '../../services/api';

const InventoryManagement: React.FC = () => {
  const [components, setComponents] = useState<Component[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [reorderPoints, setReorderPoints] = useState<Array<{
    id: number;
    name: string;
    stock: number;
    reorder_point: number;
    reorder_quantity: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getInventory();
      setAlerts(response.data.alerts);
      setReorderPoints(response.data.reorder_points);
      // Load full component details for each reorder point
      const componentIds = response.data.reorder_points.map(rp => rp.id);
      const componentsResponse = await Promise.all(
        componentIds.map(id => adminAPI.getInventory(id))
      );
      setComponents(componentsResponse.map(r => r.data));
    } catch (err) {
      setError('Failed to load inventory data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (id: number, newStock: number) => {
    try {
      setUpdateError(null);
      const response = await adminAPI.updateInventory(id, { stock: newStock });
      setComponents(components.map(comp =>
        comp.id === id ? response.data : comp
      ));
      // Refresh alerts and reorder points
      loadInventoryData();
    } catch (err) {
      setUpdateError('Failed to update stock');
      console.error(err);
    }
  };

  const handleReorder = async (id: number, quantity: number) => {
    try {
      await adminAPI.reorder({ component_id: id, quantity });
      // Refresh inventory data
      loadInventoryData();
    } catch (err) {
      setError('Failed to place reorder');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      {updateError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {updateError}
        </div>
      )}

      {/* Inventory Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Inventory Alerts</h3>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <p>{alert.message}</p>
                <p className="text-sm mt-1">Component: {alert.component.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {components.map((component) => {
          const reorderPoint = reorderPoints.find(rp => rp.id === component.id);
          return (
            <div key={component.id} className="bg-white rounded-lg shadow-md p-6">
              <img
                src={component.image_url}
                alt={component.name}
                className="w-full h-48 object-cover rounded-md mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">{component.name}</h3>
              <p className="text-gray-600 mb-2">{component.category}</p>
              <p className="text-gray-800 mb-4">${component.price}</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Stock:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStockUpdate(component.id, component.stock - 1)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{component.stock}</span>
                  <button
                    onClick={() => handleStockUpdate(component.id, component.stock + 1)}
                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    +
                  </button>
                </div>
              </div>
              {reorderPoint && component.stock <= reorderPoint.reorder_point && (
                <div className="mt-4">
                  <button
                    onClick={() => handleReorder(component.id, reorderPoint.reorder_quantity)}
                    className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                  >
                    Reorder ({reorderPoint.reorder_quantity} units)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryManagement; 