import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Input, Tag, Popconfirm, message } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';

interface TenantItem {
  id: string;
  name: string;
  description: string;
  status: string;
  member_count: number;
  created_at: string;
}

export default function TenantList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data] = useState<TenantItem[]>([
    { id: '1', name: '华为技术', description: 'AI芯片评测团队', status: 'active', member_count: 15, created_at: '2024-01-01' },
    { id: '2', name: '清华大学AI实验室', description: '模型性能研究', status: 'active', member_count: 8, created_at: '2024-01-03' },
    { id: '3', name: '百度智能云', description: '推理引擎评测', status: 'active', member_count: 12, created_at: '2024-01-05' },
    { id: '4', name: '测试租户', description: '测试用', status: 'inactive', member_count: 2, created_at: '2024-01-10' },
  ]);

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
    { title: '描述', dataIndex: 'description', key: 'description' },
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
    { title: '成员数', dataIndex: 'member_count', key: 'member_count' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/tenants/${record.id}`)}>查看</Button>
          <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
          <Popconfirm title="确定删除此租户？">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
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
        extra={<Button type="primary" icon={<PlusOutlined />}>新建租户</Button>}
      />
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input placeholder="搜索租户" prefix={<SearchOutlined />} style={{ width: 260 }} allowClear />
        <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
      />
    </div>
  );
}
