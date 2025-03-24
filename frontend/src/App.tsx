import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Builds from './pages/Builds'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './components/AdminDashboard'
import PrivateRoute from './components/PrivateRoute'
import BuildDetail from './pages/builds/BuildDetail'
import BuildEdit from './pages/builds/BuildEdit'
import BuildCreate from './pages/builds/BuildCreate'
import Profile from './pages/Profile'
import './App.css'

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/builds"
                element={
                  <PrivateRoute>
                    <Builds />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <PrivateRoute adminOnly>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />
              <Route path="/builds/:id" element={<BuildDetail />} />
              <Route path="/builds/:id/edit" element={<BuildEdit />} />
              <Route path="/builds/create" element={<BuildCreate />} />
              <Route path="/profile/:username" element={<Profile />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Provider>
  )
}

export default App
