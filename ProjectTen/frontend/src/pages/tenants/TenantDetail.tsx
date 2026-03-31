import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Table, Avatar } from 'antd';
import { ArrowLeftOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tenant] = useState({
    id,
    name: '华为技术',
    description: 'AI芯片评测团队',
    status: 'active',
    quota: { cpu: 64, memory: 256, gpu: 8 },
    created_at: '2024-01-01',
  });

  const [members] = useState([
    { id: '1', username: '李四', email: 'lisi@test.com', role: 'owner' },
    { id: '2', username: '小明', email: 'xiaoming@test.com', role: 'member' },
    { id: '3', username: '小红', email: 'xiaohong@test.com', role: 'member' },
  ]);

  const memberColumns: ColumnsType<any> = [
    {
      title: '成员',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size="small" style={{ backgroundColor: '#1B3A6B' }}>{record.username[0]}</Avatar>
          <span>{record.username}</span>
        </div>
      ),
    },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'owner' ? 'gold' : 'blue'}>
          {role === 'owner' ? '所有者' : '成员'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="租户详情"
        breadcrumbs={[
          { title: '租户管理', path: '/tenants/list' },
          { title: '租户列表', path: '/tenants/list' },
          { title: tenant.name },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tenants/list')}>返回</Button>
            <Button type="primary" icon={<EditOutlined />}>编辑</Button>
          </Space>
        }
      />

      <Card title="基本信息" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="租户名称">{tenant.name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color="green">正常</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>{tenant.description}</Descriptions.Item>
          <Descriptions.Item label="CPU 配额">{tenant.quota.cpu} 核</Descriptions.Item>
          <Descriptions.Item label="内存配额">{tenant.quota.memory} GB</Descriptions.Item>
          <Descriptions.Item label="GPU 配额">{tenant.quota.gpu} 卡</Descriptions.Item>
          <Descriptions.Item label="创建时间">{tenant.created_at}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="成员列表"
        style={{ borderRadius: 8 }}
        extra={<Button icon={<PlusOutlined />} type="primary" size="small">添加成员</Button>}
      >
        <Table columns={memberColumns} dataSource={members} rowKey="id" pagination={false} />
      </Card>
    </div>
  );
}
