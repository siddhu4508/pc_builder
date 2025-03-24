import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store';
import api from '../../services/api';

interface Component {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
}

interface Build {
  id: number;
  title: string;
  description: string;
  components: number[];
}

const BuildEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [build, setBuild] = useState<Build | null>(null);
  const [availableComponents, setAvailableComponents] = useState<Component[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    components: [] as number[],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBuild = async () => {
      try {
        const response = await api.get(`/builds/${id}/`);
        const buildData = response.data;
        setBuild(buildData);
        setFormData({
          title: buildData.title,
          description: buildData.description,
          components: buildData.components.map((c: Component) => c.id),
        });
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch build');
      } finally {
        setLoading(false);
      }
    };

    const fetchComponents = async () => {
      try {
        const response = await api.get('/components/');
        setAvailableComponents(response.data);
      } catch (err) {
        console.error('Failed to fetch components:', err);
      }
    };

    fetchBuild();
    fetchComponents();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleComponentSelect = (componentId: number) => {
    setFormData((prev) => ({
      ...prev,
      components: prev.components.includes(componentId)
        ? prev.components.filter((id) => id !== componentId)
        : [...prev.components, componentId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await api.put(`/builds/${id}/`, formData);
      navigate(`/builds/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update build');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !build) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
          <div className="text-sm text-red-700 dark:text-red-200">
            {error || 'Build not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Edit Build
      </h1>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900 p-4 mb-6">
          <div className="text-sm text-red-700 dark:text-red-200">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Title
          </label>
          <input
            type="text"
            name="title"
            id="title"
            required
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:text-white"
            value={formData.title}
            onChange={handleChange}
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description
          </label>
          <textarea
            name="description"
            id="description"
            rows={4}
            required
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:text-white"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Components
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableComponents.map((component) => (
              <div
                key={component.id}
                className={`relative rounded-lg border p-4 cursor-pointer transition-colors duration-200 ${
                  formData.components.includes(component.id)
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
                onClick={() => handleComponentSelect(component.id)}
              >
                <img
                  src={component.image_url}
                  alt={component.name}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {component.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {component.category}
                </p>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                  ${component.price.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/builds/${id}`)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BuildEdit; 