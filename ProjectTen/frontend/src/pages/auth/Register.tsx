import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Steps, Radio, Typography, Space, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, BankOutlined, PhoneOutlined } from '@ant-design/icons';
import { register } from '@/api/auth';
import { USER_TYPES } from '@/utils/constants';

const { Title, Text } = Typography;

export default function Register() {
  const [current, setCurrent] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const steps = [
    { title: '基础信息' },
    { title: '用户类型' },
    { title: '补充信息' },
  ];

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      setFormData({ ...formData, ...values });
      setCurrent(current + 1);
    } catch {
      // validation error
    }
  };

  const handlePrev = () => {
    setCurrent(current - 1);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const allData = { ...formData, ...values };
      setLoading(true);
      await register(allData);
      message.success('注册成功，请登录');
      navigate('/login');
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (current) {
      case 0:
        return (
          <>
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, max: 20, message: '用户名长度为3-20个字符' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 8, message: '密码至少8位' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次密码输入不一致'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请再次输入密码" />
            </Form.Item>
          </>
        );
      case 1:
        return (
          <Form.Item
            name="user_type"
            label="选择用户类型"
            rules={[{ required: true, message: '请选择用户类型' }]}
          >
            <Radio.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {USER_TYPES.map((type) => (
                  <Radio.Button
                    key={type.value}
                    value={type.value}
                    style={{
                      width: '100%',
                      height: 'auto',
                      padding: '16px 20px',
                      borderRadius: 8,
                      marginBottom: 8,
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{type.label}</div>
                      <div style={{ color: '#999', fontSize: 12 }}>{type.description}</div>
                    </div>
                  </Radio.Button>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>
        );
      case 2:
        return (
          <>
            <Form.Item name="organization" label="所属机构">
              <Input prefix={<BankOutlined />} placeholder="请输入所属机构名称（选填）" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="手机号"
              rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="请输入手机号（选填）" />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card
      style={{
        width: 520,
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={3} style={{ color: '#1B3A6B', marginBottom: 8 }}>
          注册账号
        </Title>
        <Text type="secondary">创建您的“上海人工智能实验室，AGI4SCI适配&验证基地”账号</Text>
      </div>

      <Steps current={current} items={steps} style={{ marginBottom: 32 }} size="small" />

      <Form form={form} layout="vertical" initialValues={formData}>
        {renderStep()}
      </Form>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        {current > 0 && <Button onClick={handlePrev}>上一步</Button>}
        <div style={{ marginLeft: 'auto' }}>
          {current < steps.length - 1 && (
            <Button type="primary" onClick={handleNext}>
              下一步
            </Button>
          )}
          {current === steps.length - 1 && (
            <Button type="primary" loading={loading} onClick={handleSubmit}>
              完成注册
            </Button>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Text type="secondary">
          已有账号？
          <Link to="/login" style={{ marginLeft: 4 }}>
            立即登录
          </Link>
        </Text>
      </div>
    </Card>
  );
}
