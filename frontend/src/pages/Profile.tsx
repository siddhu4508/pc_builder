import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppSelector } from '../store';
import api from '../services/api';

interface Build {
  id: number;
  title: string;
  description: string;
  total_price: number;
  created_at: string;
  likes_count: number;
  comments_count: number;
  image_url: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  profile_picture: string | null;
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [user, setUser] = useState<User | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get(`/users/${username}/`);
        setUser(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch user');
      } finally {
        setLoading(false);
      }
    };

    const fetchBuilds = async () => {
      try {
        const response = await api.get(`/users/${username}/builds/`);
        setBuilds(response.data);
      } catch (err) {
        console.error('Failed to fetch builds:', err);
      }
    };

    fetchUser();
    fetchBuilds();
  }, [username]);

  const handleFollow = async () => {
    if (!user || !currentUser) return;

    try {
      await api.post(`/users/${user.id}/follow/`);
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          followers_count: prev.is_following ? prev.followers_count - 1 : prev.followers_count + 1,
          is_following: !prev.is_following,
        };
      });
    } catch (err) {
      console.error('Failed to follow user:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
          <div className="text-sm text-red-700 dark:text-red-200">
            {error || 'User not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
        <div className="flex items-center space-x-6">
          <img
            className="h-24 w-24 rounded-full"
            src={user.profile_picture || 'https://via.placeholder.com/96'}
            alt={user.username}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.username}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
              {currentUser && currentUser.id !== user.id && (
                <button
                  onClick={handleFollow}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    user.is_following
                      ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {user.is_following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            <div className="mt-4 flex space-x-6">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Followers</span>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {user.followers_count}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Following</span>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {user.following_count}
                </p>
              </div>
            </div>
            {user.bio && (
              <p className="mt-4 text-gray-600 dark:text-gray-300">{user.bio}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Builds
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((build) => (
            <Link
              key={build.id}
              to={`/builds/${build.id}`}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
            >
              <img
                src={build.image_url}
                alt={build.title}
                className="w-full h-48 object-cover rounded-t-lg"
              />
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {build.title}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300 line-clamp-2">
                  {build.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    ${build.total_price.toLocaleString()}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {build.likes_count} likes
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {build.comments_count} comments
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {builds.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No builds found. {currentUser?.id === user.id && 'Create your first build!'}
            </p>
            {currentUser?.id === user.id && (
              <Link
                to="/builds/create"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Build
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 