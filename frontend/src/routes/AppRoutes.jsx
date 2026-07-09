import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import Home from '../pages/Home';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { SearchResult } from '../pages/SearchResult';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminRoute from './AdminRoute';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <AuthLayout>
          <Login />
        </AuthLayout>
      } />

      <Route path="/register" element={
        <AuthLayout>
          <Register />
        </AuthLayout>
      } />

      {/* Route sử dụng MainLayout (Có Header, Footer) */}
      <Route path="/" element={
        <MainLayout>
          <Home />
        </MainLayout>
      } />

      <Route element={<ProtectedRoute />}>
        <Route path="/search-result" element={
          <MainLayout>
            <SearchResult />
          </MainLayout>
        } />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        } />
      </Route>
      
    </Routes>
  );
}
