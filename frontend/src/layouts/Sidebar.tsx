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
  TrophyOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  MessageOutlined,
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
  const isTenantUser = Boolean(user?.tenant_id) && user?.username?.startsWith('tenant');
  const isPersonalUser = !isAdmin && !isTenantUser;

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      ...(!isPersonalUser
        ? [
            {
              key: '/dashboard',
              icon: <HomeOutlined />,
              label: '控制台',
            },
            {
              key: '/dl-agent',
              icon: <MessageOutlined />,
              label: 'DL智能体',
              children: [
                {
                  key: '/dl-agent/create',
                  icon: <MessageOutlined />,
                  label: '对话式启动',
                },
              ],
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
              key: '/adaptation',
              icon: <DeploymentUnitOutlined />,
              label: '适配系统',
              children: [
                {
                  key: '/adaptation/list',
                  icon: <UnorderedListOutlined />,
                  label: '适配任务',
                },
                {
                  key: '/adaptation/create',
                  icon: <ExperimentOutlined />,
                  label: '新建适配',
                },
              ],
            },
          ]
        : []),
      {
        key: '/benchmark',
        icon: <ThunderboltOutlined />,
        label: 'Benchmark',
        children: [
          {
            key: '/benchmark/operators',
            icon: <ThunderboltOutlined />,
            label: '算子 Benchmark',
          },
          {
            key: '/benchmark/models',
            icon: <TrophyOutlined />,
            label: '模型部署榜单',
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
          {
            key: '/assets/GPUs',
            icon: <DatabaseOutlined />,
            label: 'GPU 去向',
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

    if (isAdmin) {
      items.push({
        key: '/tenants',
        icon: <BankOutlined />,
        label: '租户管理',
        children: [
          {
            key: '/tenants/list',
            icon: <UnorderedListOutlined />,
            label: '租户列表',
          },
          {
            key: '/tenants/apply',
            icon: <UnorderedListOutlined />,
            label: '租户申请',
          },
        ],
      });
    }

    items.push({
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
      children: [
        {
          key: '/settings/profile',
          icon: <SettingOutlined />,
          label: '个人设置',
        },
        ...(isPersonalUser
          ? [
              {
                key: '/settings/become-tenant',
                icon: <PlusCircleOutlined />,
                label: '成为租户',
              },
            ]
          : []),
      ],
    });

    return items;
  }, [isAdmin, isPersonalUser]);

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
        background: 'linear-gradient(180deg, rgba(5, 15, 28, 0.96), rgba(7, 18, 32, 0.9))',
        borderRight: '1px solid rgba(79, 216, 255, 0.12)',
        boxShadow: '12px 0 40px rgba(0, 0, 0, 0.18)',
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
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2f7cf6, #4fd8ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 16,
              boxShadow: '0 0 22px rgba(79, 216, 255, 0.28)',
            }}
          >
            AI
          </div>
          {!collapsed && (
            <div style={{ color: '#eef8ff', lineHeight: 1.15 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.2 }}>
                上海人工智能实验室
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(238,248,255,0.82)' }}>
                AGI4SCI适配&验证基地
              </div>
            </div>
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
        style={{ borderRight: 0, background: 'transparent', paddingTop: 10 }}
      />
    </Sider>
  );
}
