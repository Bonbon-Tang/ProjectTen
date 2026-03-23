import { useState } from 'react';
import { Card, Form, Input, Button, Avatar, Tabs, message, Alert, Upload } from 'antd';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import useAuthStore from '@/stores/authStore';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const isPersonalUser = user?.role === 'personal';
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      // API call here
      updateUser(values);
      message.success('个人信息更新成功');
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    try {
      // API call here
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch {}
  };

  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <div style={{ maxWidth: 500 }}>
          {isPersonalUser && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="成为租户"
              description="当前账号仅可登录查看信息、资产和评测报告。若要使用机器和创建任务，请先注册成为租户账号。"
              action={<Button type="primary" size="small" href="/settings/become-tenant">成为租户</Button>}
            />
          )}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: '#1B3A6B' }} />
            <div style={{ marginTop: 12 }}>
              <Upload showUploadList={false}>
                <Button icon={<UploadOutlined />} size="small">更换头像</Button>
              </Upload>
            </div>
          </div>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ username: user?.username, email: user?.email }}
            onFinish={handleUpdateProfile}
          >
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="手机号">
              <Input placeholder="请输入手机号" />
            </Form.Item>
            <Form.Item name="organization" label="所属机构">
              <Input placeholder="请输入所属机构" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存修改
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'password',
      label: '修改密码',
      children: (
        <div style={{ maxWidth: 500 }}>
          <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
            <Form.Item
              name="old_password"
              label="当前密码"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password placeholder="请输入当前密码" />
            </Form.Item>
            <Form.Item
              name="new_password"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 8, message: '密码至少8位' },
              ]}
            >
              <Input.Password placeholder="请输入新密码" />
            </Form.Item>
            <Form.Item
              name="confirm_password"
              label="确认新密码"
              dependencies={['new_password']}
              rules={[
                { required: true, message: '请再次输入新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次密码输入不一致'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="请再次输入新密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="个人设置"
        breadcrumbs={[{ title: '设置', path: '/settings/profile' }, { title: '个人设置' }]}
      />
      <Card style={{ borderRadius: 8 }}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
