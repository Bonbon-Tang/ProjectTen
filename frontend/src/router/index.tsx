import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';
import PrivateRoute from '@/components/PrivateRoute';

// 懒加载页面组件
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));
const UserList = lazy(() => import('@/pages/users/UserList'));
const UserDetail = lazy(() => import('@/pages/users/UserDetail'));
const TenantList = lazy(() => import('@/pages/tenants/TenantList'));
const TenantDetail = lazy(() => import('@/pages/tenants/TenantDetail'));
const EvalList = lazy(() => import('@/pages/evaluations/EvalList'));
const EvalCreate = lazy(() => import('@/pages/evaluations/EvalCreate'));
const EvalDetail = lazy(() => import('@/pages/evaluations/EvalDetail'));
const ReportList = lazy(() => import('@/pages/reports/ReportList'));
const ReportDetail = lazy(() => import('@/pages/reports/ReportDetail'));
const MyArchives = lazy(() => import('@/pages/reports/MyArchives'));
const AssetList = lazy(() => import('@/pages/assets/AssetList'));
const AssetUpload = lazy(() => import('@/pages/assets/AssetUpload'));
const BenchmarkList = lazy(() => import('@/pages/benchmark/BenchmarkList'));
const Profile = lazy(() => import('@/pages/settings/Profile'));

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 300 }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

export default function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* 认证页面 */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* 主应用页面 */}
        <Route
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />

          {/* 评测系统 */}
          <Route path="/evaluations/list" element={<EvalList />} />
          <Route path="/evaluations/create" element={<EvalCreate />} />
          <Route path="/evaluations/:id" element={<EvalDetail />} />

          {/* Benchmark */}
          <Route path="/benchmark/operators" element={<BenchmarkList />} />

          {/* 报告管理 */}
          <Route path="/reports/list" element={<ReportList />} />
          <Route path="/reports/compare" element={<ReportList />} />
          <Route path="/reports/archives" element={<MyArchives />} />
          <Route path="/reports/:id" element={<ReportDetail />} />

          {/* 资产管理 */}
          <Route path="/assets/list" element={<AssetList />} />
          <Route path="/assets/upload" element={<AssetUpload />} />

          {/* 用户管理 */}
          <Route path="/users/list" element={
            <PrivateRoute requireAdmin>
              <UserList />
            </PrivateRoute>
          } />
          <Route path="/users/:id" element={
            <PrivateRoute requireAdmin>
              <UserDetail />
            </PrivateRoute>
          } />

          {/* 租户管理 */}
          <Route path="/tenants/list" element={<TenantList />} />
          <Route path="/tenants/:id" element={<TenantDetail />} />

          {/* 设置 */}
          <Route path="/settings/profile" element={<Profile />} />
        </Route>

        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
