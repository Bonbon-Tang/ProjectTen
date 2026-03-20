import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  TeamOutlined,
  BankOutlined,
  SettingOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  UploadOutlined,
  SwapOutlined,
  FolderOpenOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import useAuthStore from '@/stores/authStore';
import useAppStore from '@/stores/appStore';

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { collapsed } = useAppStore();
  const isAdmin = user?.role === 'admin';

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      {
        key: '/dashboard',
        icon: <HomeOutlined />,
        label: '工作台',
      },
      {
        key: '/evaluations',
        icon: <BarChartOutlined />,
        label: '评测系统',
        children: [
          {
            key: '/evaluations/list',
            icon: <UnorderedListOutlined />,
            label: '评测任务',
          },
          {
            key: '/evaluations/create',
            icon: <PlusCircleOutlined />,
            label: '创建任务',
          },
        ],
      },
      {
        key: '/benchmark',
        icon: <ThunderboltOutlined />,
        label: 'Benchmark',
        children: [
          {
            key: '/benchmark/operators',
            icon: <ThunderboltOutlined />,
            label: '算子Benchmark',
          },
        ],
      },
      {
        key: '/reports',
        icon: <FileTextOutlined />,
        label: '报告管理',
        children: [
          {
            key: '/reports/list',
            icon: <UnorderedListOutlined />,
            label: '评测报告',
          },
          {
            key: '/reports/compare',
            icon: <SwapOutlined />,
            label: '报告对比',
          },
          {
            key: '/reports/archives',
            icon: <FolderOpenOutlined />,
            label: '我的存档',
          },
        ],
      },
      {
        key: '/assets',
        icon: <DatabaseOutlined />,
        label: '资产管理',
        children: [
          {
            key: '/assets/list',
            icon: <UnorderedListOutlined />,
            label: '资产列表',
          },
          {
            key: '/assets/upload',
            icon: <UploadOutlined />,
            label: '上传资产',
          },
        ],
      },
    ];

    if (isAdmin) {
      items.push({
        key: '/users',
        icon: <TeamOutlined />,
        label: '用户管理',
        children: [
          {
            key: '/users/list',
            icon: <UnorderedListOutlined />,
            label: '用户列表',
          },
        ],
      });
    }

    items.push(
      {
        key: '/tenants',
        icon: <BankOutlined />,
        label: '租户管理',
        children: [
          {
            key: '/tenants/list',
            icon: <UnorderedListOutlined />,
            label: '租户列表',
          },
        ],
      },
      {
        key: '/settings',
        icon: <SettingOutlined />,
        label: '设置',
        children: [
          {
            key: '/settings/profile',
            icon: <SettingOutlined />,
            label: '个人设置',
          },
        ],
      },
    );

    return items;
  }, [isAdmin]);

  // 计算当前选中和展开的菜单
  const selectedKeys = [location.pathname];
  const openKeys = useMemo(() => {
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean);
    if (parts.length > 1) {
      return ['/' + parts[0]];
    }
    return [];
  }, [location.pathname]);

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={220}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: '#001529',
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2196F3, #1B3A6B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 16,
            }}
          >
            AI
          </div>
          {!collapsed && (
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
              AI验证平台
            </span>
          )}
        </div>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        defaultOpenKeys={openKeys}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ borderRight: 0 }}
      />
    </Sider>
  );
}
