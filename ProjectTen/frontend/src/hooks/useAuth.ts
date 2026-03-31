import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import useAuthStore from '@/stores/authStore';
import { login as loginApi, logout as logoutApi, getCurrentUser, type LoginParams } from '@/api/auth';
import api from '@/api/index';

export function useAuth() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const login = useCallback(
    async (params: LoginParams) => {
      try {
        const res: any = await loginApi(params);
        const data = res.data || res;
        // 后端返回 access_token / refresh_token
        const token = data.access_token;
        if (token) {
          // 先存token，再用token拉取用户信息
          localStorage.setItem('token', token);
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }
          // 拉取当前用户信息
          try {
            const userRes: any = await api.get('/users/me');
            const userInfo = userRes.data || userRes;
            setAuth(token, {
              id: String(userInfo.id),
              username: userInfo.username,
              email: userInfo.email,
              role: userInfo.user_type || 'personal',
              avatar: userInfo.avatar,
              tenant_id: userInfo.tenant_id ?? null,
            });
          } catch {
            // 用户信息拉取失败，用基础信息
            setAuth(token, {
              id: '',
              username: params.username,
              email: '',
              role: 'personal',
            });
          }
          message.success('登录成功');
          navigate('/dashboard');
        } else {
          message.error('登录失败：未获取到令牌');
        }
      } catch (error: any) {
        message.error(error?.response?.data?.detail || error?.message || '登录失败，请检查用户名和密码');
        throw error;
      }
    },
    [navigate, setAuth],
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // 即使退出接口失败也清除本地状态
    }
    clearAuth();
    localStorage.removeItem('refresh_token');
    message.success('已退出登录');
    navigate('/login');
  }, [navigate, clearAuth]);

  const isAdmin = user?.role === 'admin';

  return { user, isAuthenticated, isAdmin, login, logout };
}

export default useAuth;
