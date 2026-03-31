import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
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
    <Card className="login-hero-card" bodyStyle={{ padding: 0, display: 'flex' }}>
      {/* 左侧品牌区 */}
      <div className="login-side-panel">
        <div className="login-side-chip">AGI4SCI BASE</div>
        <div className="login-brand-stack">
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: 'linear-gradient(135deg, #1f67ff 0%, #63dbff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 30,
              fontSize: 27,
              fontWeight: 800,
              color: '#04111f',
              letterSpacing: 1,
              boxShadow: '0 0 38px rgba(99, 219, 255, 0.34)',
            }}
          >
            AI
          </div>
          <div style={{ marginBottom: 14, color: 'rgba(158, 228, 255, 0.88)', fontSize: 12, letterSpacing: '0.18em', fontWeight: 700 }}>
            MODEL ADAPTATION & VALIDATION HUB
          </div>
          <Title level={2} style={{ color: '#fbfeff', marginBottom: 14, textShadow: '0 2px 10px rgba(0,0,0,0.26)', lineHeight: 1.32, maxWidth: 320 }}>
            上海人工智能实验室，AGI4SCI适配&验证基地
          </Title>
          <Paragraph style={{ color: 'rgba(244, 250, 255, 0.96)', fontSize: 16, lineHeight: 1.95, fontWeight: 500, maxWidth: 320, marginBottom: 0 }}>
            面向先进算力平台的模型适配与验证中枢
          </Paragraph>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="login-form-panel">
        <div className="login-form-shell">
          <div style={{ marginBottom: 30 }}>
            <div style={{ color: '#6a809c', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', marginBottom: 10 }}>
              SECURE ACCESS
            </div>
            <Title level={3} style={{ marginBottom: 8, color: '#10284d' }}>
              欢迎进入
            </Title>
            <Text style={{ display: 'block', marginBottom: 0, color: '#38506f', fontWeight: 500, lineHeight: 1.8 }}>
              请输入账号信息，进入上海人工智能实验室，AGI4SCI适配&验证基地
            </Text>
          </div>

          <Form form={form} onFinish={handleSubmit} size="large" layout="vertical">
            <Form.Item
              name="username"
              label="账号"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#5d6f88' }} />}
                placeholder="请输入用户名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#5d6f88' }} />}
                placeholder="请输入密码"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 18, marginTop: 6 }}>
              <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 48, borderRadius: 12, fontWeight: 700 }}>
                进入基地
              </Button>
            </Form.Item>
          </Form>

          <Divider plain>
            <Text style={{ fontSize: 12, color: '#5c708b', fontWeight: 500 }}>
              账户服务
            </Text>
          </Divider>

          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: '#4e647f' }}>
              还没有账号？
              <Link to="/register" style={{ marginLeft: 4, color: '#225fd6', fontWeight: 600 }}>
                立即注册
              </Link>
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
}
