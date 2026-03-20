import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Space, Input, Select, Avatar, Tag, Popconfirm, message } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';

interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  organization: string;
  created_at: string;
}

export default function UserList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data] = useState<UserItem[]>([
    { id: '1', username: '张三', email: 'zhangsan@test.com', role: 'admin', status: 'active', organization: '平台管理部', created_at: '2024-01-01' },
    { id: '2', username: '李四', email: 'lisi@test.com', role: 'enterprise', status: 'active', organization: '华为技术', created_at: '2024-01-05' },
    { id: '3', username: '王五', email: 'wangwu@test.com', role: 'research', status: 'active', organization: '清华大学', created_at: '2024-01-10' },
    { id: '4', username: '赵六', email: 'zhaoliu@test.com', role: 'personal', status: 'inactive', organization: '', created_at: '2024-01-12' },
  ]);
  const [pagination] = useState({ current: 1, pageSize: 10, total: 4 });

  const roleMap: Record<string, { label: string; color: string }> = {
    admin: { label: '管理员', color: 'red' },
    enterprise: { label: '企业用户', color: 'blue' },
    research: { label: '科研机构', color: 'purple' },
    personal: { label: '个人用户', color: 'green' },
  };

  const columns: ColumnsType<UserItem> = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar style={{ backgroundColor: '#1B3A6B' }}>{record.username[0]}</Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.username}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const r = roleMap[role];
        return r ? <Tag color={r.color}>{r.label}</Tag> : <Tag>{role}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '所属机构',
      dataIndex: 'organization',
      key: 'organization',
      render: (text: string) => text || '-',
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/users/${record.id}`)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<KeyOutlined />}>
            重置密码
          </Button>
          <Popconfirm title="确定删除此用户？">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="用户列表"
        breadcrumbs={[{ title: '用户管理', path: '/users/list' }, { title: '用户列表' }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            添加用户
          </Button>
        }
      />

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input placeholder="搜索用户名/邮箱" prefix={<SearchOutlined />} style={{ width: 260 }} allowClear />
        <Select placeholder="角色筛选" style={{ width: 140 }} allowClear options={Object.entries(roleMap).map(([k, v]) => ({ label: v.label, value: k }))} />
        <Select
          placeholder="状态筛选"
          style={{ width: 140 }}
          allowClear
          options={[
            { label: '正常', value: 'active' },
            { label: '禁用', value: 'inactive' },
          ]}
        />
        <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </div>
  );
}
