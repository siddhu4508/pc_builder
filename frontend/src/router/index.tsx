import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import Home from '../pages/Home';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Profile from '../pages/Profile';
import BuildCreate from '../pages/builds/BuildCreate';
import BuildDetail from '../pages/builds/BuildDetail';
import BuildEdit from '../pages/builds/BuildEdit';
import PCBuilder from '../components/PCBuilder';
import AdminDashboard from '../components/AdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAppSelector((state) => state.auth);
  if (!user) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

// Public Route Component (accessible only when not authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAppSelector((state) => state.auth);
  if (user) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAppSelector((state) => state.auth);
  if (!user || !user.is_staff) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'builder',
        element: <PCBuilder />,
      },
      {
        path: 'profile/:username',
        element: <Profile />,
      },
      {
        path: 'builds',
        children: [
          {
            path: 'create',
            element: (
              <ProtectedRoute>
                <BuildCreate />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: <BuildDetail />,
          },
          {
            path: ':id/edit',
            element: (
              <ProtectedRoute>
                <BuildEdit />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: 'admin/dashboard',
        element: (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        ),
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router; 