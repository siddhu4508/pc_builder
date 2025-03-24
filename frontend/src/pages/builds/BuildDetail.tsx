import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user: {
    id: number;
    username: string;
    profile_picture: string | null;
  };
}

interface Build {
  id: number;
  title: string;
  description: string;
  total_price: number;
  created_at: string;
  user: {
    id: number;
    username: string;
    profile_picture: string | null;
  };
  components: Component[];
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

const BuildDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const [build, setBuild] = useState<Build | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBuild = async () => {
      try {
        const response = await api.get(`/builds/${id}/`);
        setBuild(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch build');
      } finally {
        setLoading(false);
      }
    };

    fetchBuild();
  }, [id]);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await api.get(`/comments/?build_id=${id}`);
        setComments(response.data);
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      }
    };

    fetchComments();
  }, [id]);

  const handleLike = async () => {
    if (!user || !build) return;

    try {
      await api.post(`/builds/${id}/like/`);
      setBuild((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1,
          is_liked: !prev.is_liked,
        };
      });
    } catch (err) {
      console.error('Failed to like build:', err);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    try {
      const response = await api.post('/comments/', {
        content: newComment,
        build_id: id,
      });
      setComments((prev) => [...prev, response.data]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment:', err);
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              to={`/profile/${build.user.username}`}
              className="flex items-center"
            >
              <img
                className="h-10 w-10 rounded-full"
                src={build.user.profile_picture || 'https://via.placeholder.com/40'}
                alt={build.user.username}
              />
              <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                {build.user.username}
              </span>
            </Link>
            <span className="mx-2 text-gray-500 dark:text-gray-400">•</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(build.created_at).toLocaleDateString()}
            </span>
          </div>
          {user?.id === build.user.id && (
            <Link
              to={`/builds/${build.id}/edit`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Edit Build
            </Link>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
          {build.title}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">{build.description}</p>
        <div className="mt-4 flex items-center space-x-4">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 ${
              build.is_liked
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <svg
              className="h-5 w-5"
              fill={build.is_liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{build.likes_count}</span>
          </button>
          <span className="text-gray-500 dark:text-gray-400">
            {build.comments_count} comments
          </span>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Components
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {build.components.map((component) => (
            <div
              key={component.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              <img
                src={component.image_url}
                alt={component.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {component.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {component.category}
                </p>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  {component.description}
                </p>
                <p className="mt-2 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  ${component.price.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
          Total Price: ${build.total_price.toLocaleString()}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Comments
        </h2>
        {user && (
          <form onSubmit={handleComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:text-white"
              rows={3}
            />
            <button
              type="submit"
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Post Comment
            </button>
          </form>
        )}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="flex items-center">
                <img
                  className="h-8 w-8 rounded-full"
                  src={comment.user.profile_picture || 'https://via.placeholder.com/32'}
                  alt={comment.user.username}
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.user.username}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BuildDetail; 