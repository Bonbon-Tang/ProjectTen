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
        <div className="login-side-chip">AGI4Sci</div>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #1f67ff 0%, #63dbff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 26,
            fontSize: 26,
            fontWeight: 800,
            color: '#04111f',
            letterSpacing: 1,
            boxShadow: '0 0 34px rgba(99, 219, 255, 0.32)',
          }}
        >
          AI
        </div>
        <Title level={2} style={{ color: '#fbfeff', marginBottom: 10, textShadow: '0 2px 8px rgba(0,0,0,0.24)', lineHeight: 1.25 }}>
          上海人工智能实验室 AGI4Sci
        </Title>
        <Paragraph style={{ color: 'rgba(244, 250, 255, 0.96)', fontSize: 15, lineHeight: 1.9, fontWeight: 500, maxWidth: 280, marginBottom: 0 }}>
          适配与验证基地访问入口
        </Paragraph>
      </div>

      {/* 右侧登录表单 */}
      <div className="login-form-panel">
        <Title level={3} style={{ marginBottom: 8, color: '#10284d' }}>
          欢迎回来
        </Title>
        <Text style={{ display: 'block', marginBottom: 32, color: '#38506f', fontWeight: 500 }}>
          请输入账号和密码
        </Text>

        <Form form={form} onFinish={handleSubmit} size="large" layout="vertical">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#5d6f88' }} />}
              placeholder="请输入用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#5d6f88' }} />}
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
          <Text style={{ fontSize: 12, color: '#5c708b', fontWeight: 500 }}>
            其他方式
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
    </Card>
  );
}
