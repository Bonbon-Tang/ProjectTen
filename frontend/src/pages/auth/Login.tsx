import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import useAuth from '@/hooks/useAuth';

const { Title, Text, Paragraph } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [form] = Form.useForm();

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{
        width: 860,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}
      bodyStyle={{ padding: 0, display: 'flex' }}
    >
      {/* 左侧介绍 */}
      <div
        style={{
          width: 380,
          background: 'linear-gradient(180deg, #1B3A6B 0%, #0D2147 100%)',
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #2196F3, #64B5F6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            fontSize: 24,
            fontWeight: 'bold',
          }}
        >
          AI
        </div>
        <Title level={3} style={{ color: '#fff', marginBottom: 16 }}>
          人工智能软硬件验证平台
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8 }}>
          专业的 AI 模型与硬件评测平台，提供全面的性能测试、精度验证和兼容性评估服务。
        </Paragraph>
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <SafetyOutlined style={{ fontSize: 20, color: '#64B5F6' }} />
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>安全可靠的测试环境</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <SafetyOutlined style={{ fontSize: 20, color: '#64B5F6' }} />
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>多维度评测指标体系</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SafetyOutlined style={{ fontSize: 20, color: '#64B5F6' }} />
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>专业评测报告生成</Text>
          </div>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div style={{ flex: 1, padding: '60px 48px' }}>
        <Title level={3} style={{ marginBottom: 8, color: '#1B3A6B' }}>
          欢迎回来
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
          请输入您的账号和密码登录平台
        </Text>

        <Form form={form} onFinish={handleSubmit} size="large" layout="vertical">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bbb' }} />}
              placeholder="请输入用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bbb' }} />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 44, borderRadius: 8 }}>
              登 录
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text type="secondary" style={{ fontSize: 12 }}>
            其他方式
          </Text>
        </Divider>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            还没有账号？
            <Link to="/register" style={{ marginLeft: 4 }}>
              立即注册
            </Link>
          </Text>
        </div>
      </div>
    </Card>
  );
}
