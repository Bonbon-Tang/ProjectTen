import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Select, InputNumber, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import { approveTenantApplication, getTenantApplications } from '@/api/tenantApplications';

interface ApplicationItem {
  id: number;
  user_id: number;
  tenant_name: string;
  contact_person: string;
  contact_email: string;
  description?: string;
  status: string;
  created_at?: string;
}

export default function TenantApplyList() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApplicationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ApplicationItem | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getTenantApplications();
      const items = res?.data || [];
      setData(Array.isArray(items) ? items : []);
    } catch {
      message.error('加载租户申请失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async () => {
    const values = await form.validateFields();
    if (!current) return;
    try {
      await approveTenantApplication(current.id, values);
      message.success('审批通过');
      setOpen(false);
      setCurrent(null);
      form.resetFields();
      fetchData();
    } catch {
      message.error('审批失败');
    }
  };

  const columns: ColumnsType<ApplicationItem> = [
    { title: '申请用户ID', dataIndex: 'user_id', key: 'user_id', width: 100 },
    { title: '申请租户名', dataIndex: 'tenant_name', key: 'tenant_name', width: 160 },
    { title: '联系人', dataIndex: 'contact_person', key: 'contact_person', width: 120 },
    { title: '联系邮箱', dataIndex: 'contact_email', key: 'contact_email', width: 200 },
    { title: '说明', dataIndex: 'description', key: 'description', render: (v?: string) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={status === 'approved' ? 'green' : 'gold'}>{status}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            disabled={record.status !== 'pending'}
            onClick={() => {
              setCurrent(record);
              setOpen(true);
            }}
          >
            批准
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="租户申请"
        breadcrumbs={[{ title: '租户管理', path: '/tenants/list' }, { title: '租户申请' }]}
      />
      <Card bordered={false}>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
      </Card>
      <Modal
        title={`审批申请：${current?.tenant_name || ''}`}
        open={open}
        onCancel={() => {
          setOpen(false);
          setCurrent(null);
          form.resetFields();
        }}
        onOk={handleApprove}
        okText="批准"
      >
        <Form form={form} layout="vertical" initialValues={{ device_type: 'huawei_910c', device_count: 1, duration_hours: 24 }}>
          <Form.Item name="device_type" label="机型" rules={[{ required: true, message: '请选择机型' }]}>
            <Select
              options={[
                { label: '华为昇腾 910C', value: 'huawei_910c' },
                { label: '华为昇腾 910B', value: 'huawei_910b' },
                { label: '寒武纪 MLU590', value: 'cambrian_590' },
                { label: '昆仑芯 P800', value: 'kunlun_p800' },
                { label: '海光 BW1000', value: 'hygon_bw1000' },
              ]}
            />
          </Form.Item>
          <Form.Item name="device_count" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="duration_hours" label="时长（小时）" rules={[{ required: true, message: '请输入时长' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
