import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import { getDeviceUsage } from '@/api/resources';

const { Text } = Typography;

interface UsageRow {
  device_id: number;
  device_name: string;
  device_type: string;
  total_count: number;
  available_count: number;
  leased_total: number;
  running_total: number;
  leased: Array<{ tenant_id: number; tenant_name: string; username: string | null; count: number; expires_at: string | null }>;
  running: Array<{ task_id: number; task_name: string; username: string | null; count: number }>;
}

export default function GpuUsage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UsageRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res: any = await getDeviceUsage();
        setRows(res?.data || []);
      } catch {
        message.error('获取设备去向失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns: ColumnsType<UsageRow> = [
    { title: '设备', dataIndex: 'device_name', key: 'device_name', width: 180 },
    { title: '型号', dataIndex: 'device_type', key: 'device_type', width: 120 },
    { title: '总数', dataIndex: 'total_count', key: 'total_count', width: 80 },
    { title: '当前可用', dataIndex: 'available_count', key: 'available_count', width: 100 },
    { title: '已租售', dataIndex: 'leased_total', key: 'leased_total', width: 80 },
    { title: '运行占用', dataIndex: 'running_total', key: 'running_total', width: 100 },
    {
      title: '租售去向',
      key: 'leased',
      width: 320,
      render: (_, record) =>
        record.leased.length ? (
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            {record.leased.map((item) => (
              <div key={`${record.device_id}-lease-${item.tenant_id}`}>
                <Tag color="blue">{item.username || item.tenant_name}</Tag>
                租售 {item.count} 台
                {item.expires_at ? <Text type="secondary">（到期：{item.expires_at.slice(0, 16).replace('T', ' ')}）</Text> : null}
              </div>
            ))}
          </div>
        ) : (
          <Text type="secondary">未租售</Text>
        ),
    },
    {
      title: '任务占用明细',
      key: 'running',
      width: 360,
      render: (_, record) =>
        record.running.length ? (
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            {record.running.map((item) => (
              <div key={`${record.device_id}-task-${item.task_id}`}>
                <Tag color="volcano">任务 {item.task_id}</Tag>
                {item.task_name} / {item.username || '未知用户'} 使用 {item.count} 台
              </div>
            ))}
          </div>
        ) : (
          <Text type="secondary">无运行任务</Text>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="GPU 去向"
        subtitle="查看所有设备的租售与任务占用明细"
        breadcrumbs={[{ title: '资产管理', path: '/assets/list' }, { title: 'GPU 去向', path: '/assets/GPUs' }]}
      />
      <Card bordered={false}>
        <Table rowKey="device_id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 1400 }} pagination={false} />
      </Card>
    </>
  );
}
