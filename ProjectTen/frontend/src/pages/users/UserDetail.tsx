import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Avatar, Tabs, Table, Space } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user] = useState({
    id: id,
    username: '张三',
    email: 'zhangsan@test.com',
    role: 'admin',
    status: 'active',
    organization: '平台管理部',
    phone: '13800138000',
    created_at: '2024-01-01 10:00:00',
    last_login: '2024-01-15 09:30:00',
  });

  return (
    <div>
      <PageHeader
        title="用户详情"
        breadcrumbs={[
          { title: '用户管理', path: '/users/list' },
          { title: '用户列表', path: '/users/list' },
          { title: user.username },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users/list')}>返回</Button>
            <Button type="primary" icon={<EditOutlined />}>编辑</Button>
          </Space>
        }
      />

      <Card style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar size={64} style={{ backgroundColor: '#1B3A6B', fontSize: 24 }}>
            {user.username[0]}
          </Avatar>
          <div>
            <h3 style={{ margin: 0 }}>{user.username}</h3>
            <span style={{ color: '#999' }}>{user.email}</span>
          </div>
        </div>

        <Descriptions bordered column={2}>
          <Descriptions.Item label="用户ID">{user.id}</Descriptions.Item>
          <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
          <Descriptions.Item label="手机号">{user.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color="red">管理员</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color="green">正常</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="所属机构">{user.organization}</Descriptions.Item>
          <Descriptions.Item label="注册时间">{user.created_at}</Descriptions.Item>
          <Descriptions.Item label="最后登录">{user.last_login}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
