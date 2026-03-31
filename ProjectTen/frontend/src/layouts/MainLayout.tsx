import { Outlet } from 'react-router-dom';
import { Layout, Input, Badge, Dropdown, Avatar, Space } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import Sidebar from './Sidebar';
import useAppStore from '@/stores/appStore';
import useAuthStore from '@/stores/authStore';
import useAuth from '@/hooks/useAuth';

const { Header, Content } = Layout;

export default function MainLayout() {
  const { collapsed, toggleCollapsed } = useAppStore();
  const { user } = useAuthStore();
  const { logout } = useAuth();

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '个人设置',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logout();
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s', background: 'transparent' }}>
        <Header
          style={{
            padding: '0 24px',
            background: 'rgba(6, 17, 31, 0.76)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(79, 216, 255, 0.12)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: 72,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span
              onClick={toggleCollapsed}
              style={{ fontSize: 18, cursor: 'pointer', color: '#7fdcff' }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Input
              placeholder="搜索任务、报告、资产..."
              prefix={<SearchOutlined style={{ color: '#6fc4ff' }} />}
              style={{ width: 320, borderRadius: 24 }}
              allowClear
            />
          </div>
          <Space size={20}>
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#8edbff' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  style={{ background: 'linear-gradient(135deg, #2f7cf6, #4fd8ff)' }}
                />
                <span style={{ color: '#eaf4ff', fontSize: 14 }}>{user?.username || '用户'}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 20,
            padding: 0,
            background: 'transparent',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <div className="page-shell">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
