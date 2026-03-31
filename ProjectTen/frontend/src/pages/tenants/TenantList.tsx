import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Input, Tag, Popconfirm, message } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageHeader from '@/components/PageHeader';
import { deleteTenant, getTenants } from '@/api/tenants';

interface TenantItem {
  id: number;
  name: string;
  description?: string;
  status: string;
  owner_id: number;
  created_at?: string;
}

export default function TenantList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<TenantItem[]>([]);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getTenants({ page: 1, page_size: 100 });
      const payload = res?.data || res;
      const items = payload?.items || payload?.list || [];
      setData(Array.isArray(items) ? items : []);
    } catch {
      message.error('加载租户列表失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleDelete = async (id: number) => {
    try {
      await deleteTenant(id);
      message.success('删除租户成功');
      fetchTenants();
    } catch {
      message.error('删除租户失败');
    }
  };

  const filteredData = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) =>
      [item.name, item.description || '', String(item.owner_id)].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [data, keyword]);

  const columns: ColumnsType<TenantItem> = [
    {
      title: '租户名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(`/tenants/${record.id}`)} style={{ fontWeight: 500 }}>
          {text}
        </a>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text?: string) => text || '-',
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
      title: 'Owner ID',
      dataIndex: 'owner_id',
      key: 'owner_id',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text?: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/tenants/${record.id}`)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} disabled>
            编辑
          </Button>
          <Popconfirm title="确定删除此租户？" onConfirm={() => handleDelete(record.id)}>
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
        title="租户列表"
        breadcrumbs={[{ title: '租户管理', path: '/tenants/list' }, { title: '租户列表' }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} disabled>
            新建租户
          </Button>
        }
      />
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input
          placeholder="搜索租户"
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetchTenants}>
          刷新
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
      />
    </div>
  );
}
