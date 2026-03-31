import { Card, Form, Input, Button, Alert, message } from 'antd';
import PageHeader from '@/components/PageHeader';
import { createTenantApplication } from '@/api/tenantApplications';

const { TextArea } = Input;

export default function BecomeTenant() {
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    try {
      await createTenantApplication(values);
      message.success('申请已提交，等待管理员审批');
      form.resetFields();
    } catch {
      message.error('提交申请失败');
    }
  };

  return (
    <div>
      <PageHeader
        title="成为租户"
        breadcrumbs={[{ title: '设置', path: '/settings/profile' }, { title: '成为租户' }]}
      />
      <Card style={{ maxWidth: 720, borderRadius: 8 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="注册租户账号"
          description="提交后可申请成为租户账号。成为租户后，才能获得设备配额、创建任务和使用机器能力。"
        />
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ contact_person: '', tenant_name: '', contact_email: '' }}>
          <Form.Item name="tenant_name" label="租户名称" rules={[{ required: true, message: '请输入租户名称' }]}>
            <Input placeholder="例如：tenant1 / 某企业评测组" />
          </Form.Item>
          <Form.Item name="contact_person" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>
          <Form.Item name="contact_email" label="联系邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
            <Input placeholder="请输入联系邮箱" />
          </Form.Item>
          <Form.Item name="description" label="申请说明">
            <TextArea rows={4} placeholder="请填写租户用途、申请原因、预期使用设备等" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">提交申请</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
