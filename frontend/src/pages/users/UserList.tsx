import { useCallback, useEffect, useMemo, useState } from 'react';
import { Table, Button, Space, Input, Select, Avatar, Tag, Popconfirm, message } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, KeyOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageHeader from '@/components/PageHeader';
import { deleteUser, getUsers } from '@/api/users';

interface UserItem {
  id: number;
  username: string;
  email: string;
  user_type: string;
  status: string;
  tenant_id?: number | null;
  created_at?: string;
}

export default function UserList() {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [data, setData] = useState<UserItem[]>([]);

  const roleMap: Record<string, { label: string; color: string }> = {
    admin: { label: '管理员', color: 'red' },
    enterprise: { label: '企业用户', color: 'blue' },
    research: { label: '科研机构', color: 'purple' },
    personal: { label: '个人用户', color: 'green' },
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getUsers({
        page: 1,
        page_size: 100,
        keyword: keyword || undefined,
        user_type: roleFilter,
        status: statusFilter,
      });
      const payload = res?.data || res;
      const items = payload?.items || payload?.list || [];
      setData(Array.isArray(items) ? items : []);
    } catch {
      message.error('加载用户列表失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id);
      message.success('删除用户成功');
      fetchUsers();
    } catch {
      message.error('删除用户失败');
    }
  };

  const users = useMemo(() => data, [data]);

  const columns: ColumnsType<UserItem> = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar style={{ backgroundColor: '#1B3A6B' }}>{record.username?.[0]?.toUpperCase() || 'U'}</Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.username}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'user_type',
      key: 'user_type',
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
          {status === 'active' ? '正常' : status}
        </Tag>
      ),
    },
    {
      title: '所属租户',
      dataIndex: 'tenant_id',
      key: 'tenant_id',
      render: (tenantId?: number | null) => (tenantId ? `tenant#${tenantId}` : '-'),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text?: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '说明',
      key: 'note',
      render: () => <span style={{ color: '#666' }}>可登录查看信息；是否可用机器取决于租户配额</span>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} disabled>
            编辑
          </Button>
          <Button type="link" size="small" icon={<KeyOutlined />} disabled>
            重置密码
          </Button>
          <Popconfirm title="确定删除此用户？" onConfirm={() => handleDelete(record.id)}>
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
          <Button type="primary" icon={<PlusOutlined />} disabled>
            添加用户
          </Button>
        }
      />

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input
          placeholder="搜索用户名/邮箱"
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          placeholder="角色筛选"
          style={{ width: 140 }}
          allowClear
          value={roleFilter}
          onChange={setRoleFilter}
          options={Object.entries(roleMap).map(([k, v]) => ({ label: v.label, value: k }))}
        />
        <Select
          placeholder="状态筛选"
          style={{ width: 140 }}
          allowClear
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: '正常', value: 'active' },
            { label: '冻结', value: 'frozen' },
            { label: '待激活', value: 'pending' },
          ]}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetchUsers}>
          刷新
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
      />
    </div>
  );
}
