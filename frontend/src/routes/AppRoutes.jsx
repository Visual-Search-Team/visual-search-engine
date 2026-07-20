import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import Home from '../pages/Home';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { SearchResult } from '../pages/SearchResult';
import { BookMark } from '../pages/BookMark';
import { SearchHistory } from '../pages/SearchHistory';
import AdminDashboard from '../pages/admin/AdminDashboard';
import { AdminIndexing } from '../pages/admin/AdminIndexing';
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
        <Route path="/bookmarks" element={
          <MainLayout>
            <BookMark />
          </MainLayout>
        } />
        <Route path="/search-history" element={
          <MainLayout>
            <SearchHistory />
          </MainLayout>
        } />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        } />
        <Route path="/admin/indexing" element={
          <AdminLayout>
            <AdminIndexing />
          </AdminLayout>
        } />
      </Route>
      
    </Routes>
  );
}
