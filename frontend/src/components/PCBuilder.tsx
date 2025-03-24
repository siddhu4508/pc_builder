import { useState, useEffect } from 'react';
import { useAppSelector } from '../store';
import api from '../services/api';

interface Component {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
  specifications: {
    socket?: string;
    chipset?: string;
    ram_type?: string;
    ram_slots?: number;
    max_ram?: number;
    wattage?: number;
    form_factor?: string;
    ports?: string[];
    generation?: string;
    [key: string]: any;
  };
}

const PCBuilder = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [components, setComponents] = useState<Component[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<Component[]>([]);
  const [compatibleComponents, setCompatibleComponents] = useState<Component[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchComponents = async () => {
      try {
        const response = await api.get('/components/');
        setComponents(response.data);
        setCompatibleComponents(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch components');
      } finally {
        setLoading(false);
      }
    };

    fetchComponents();
  }, []);

  useEffect(() => {
    const filterAndSortComponents = async () => {
      try {
        // Get compatible components from backend
        const selectedIds = selectedComponents.map(c => c.id);
        const response = await api.post('/components/check_compatibility/', {
          component_ids: selectedIds
        });
        
        // Filter by price range
        const priceFiltered = response.data.filter(
          (component: Component) =>
            component.price >= priceRange[0] && component.price <= priceRange[1]
        );

        // Sort components
        const sorted = [...priceFiltered].sort((a: Component, b: Component) => {
          let comparison = 0;
          switch (sortBy) {
            case 'price':
              comparison = a.price - b.price;
              break;
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'category':
              comparison = a.category.localeCompare(b.category);
              break;
            default:
              comparison = 0;
          }
          return sortOrder === 'asc' ? comparison : -comparison;
        });

        setCompatibleComponents(sorted);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to check compatibility');
      }
    };

    filterAndSortComponents();
  }, [selectedComponents, priceRange, sortBy, sortOrder]);

  const handleComponentSelect = async (component: Component) => {
    try {
      // Check compatibility with backend
      const selectedIds = selectedComponents.map(c => c.id);
      await api.post(`/components/${component.id}/check_compatibility/`, {
        component_ids: selectedIds
      });
      
      setSelectedComponents((prev) => [...prev, component]);
      setCurrentCategory('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Component is not compatible');
    }
  };

  const handleComponentRemove = (componentId: number) => {
    setSelectedComponents((prev) =>
      prev.filter((component) => component.id !== componentId)
    );
  };

  const handleSaveBuild = async () => {
    if (!user) {
      alert('Please log in to save your build');
      return;
    }

    try {
      await api.post('/builds/', {
        title: 'Custom Build',
        description: 'Custom PC build created with PC Builder',
        components: selectedComponents.map((c) => c.id),
      });
      alert('Build saved successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save build');
    }
  };

  const handleExportBuild = () => {
    const buildData = {
      components: selectedComponents,
      total_price: selectedComponents.reduce((total, component) => total + component.price, 0),
    };
    const jsonString = JSON.stringify(buildData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pc-build.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
          <div className="text-sm text-red-700 dark:text-red-200">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Component Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Select Components
            </h2>

            {/* Category Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Component Category
              </label>
              <select
                value={currentCategory}
                onChange={(e) => setCurrentCategory(e.target.value)}
                className="input-field"
              >
                <option value="">All Categories</option>
                <option value="CPU">CPU</option>
                <option value="Motherboard">Motherboard</option>
                <option value="RAM">RAM</option>
                <option value="GPU">GPU</option>
                <option value="Storage">Storage</option>
                <option value="PSU">PSU</option>
                <option value="Case">Case</option>
                <option value="Cooling">Cooling</option>
              </select>
            </div>

            {/* Price Range Slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
              </label>
              <input
                type="range"
                min="0"
                max="100000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full"
              />
            </div>

            {/* Sorting Options */}
            <div className="mb-6 flex space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field"
              >
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="category">Category</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="btn-secondary"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {/* Component List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {compatibleComponents
                .filter((component) =>
                  currentCategory ? component.category === currentCategory : true
                )
                .map((component) => (
                  <div
                    key={component.id}
                    className="card p-4 hover:shadow-lg transition-shadow duration-200"
                  >
                    <img
                      src={component.image_url}
                      alt={component.name}
                      className="w-full h-32 object-cover rounded-md mb-4"
                    />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {component.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {component.category}
                    </p>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                      ₹{component.price.toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleComponentSelect(component)}
                      className="btn-primary w-full mt-4"
                    >
                      Add to Build
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Selected Components */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Your Build
            </h2>

            {selectedComponents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                Start by selecting components for your build
              </p>
            ) : (
              <>
                <div className="space-y-4">
                  {selectedComponents.map((component) => (
                    <div
                      key={component.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {component.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ₹{component.price.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleComponentRemove(component.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-medium text-gray-900 dark:text-white">
                      Total Price:
                    </span>
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      ₹{selectedComponents.reduce((total, component) => total + component.price, 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={handleSaveBuild}
                      className="btn-primary flex-1"
                    >
                      Save Build
                    </button>
                    <button
                      onClick={handleExportBuild}
                      className="btn-secondary flex-1"
                    >
                      Export
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PCBuilder; 