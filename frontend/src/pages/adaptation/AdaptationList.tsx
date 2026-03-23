import { useEffect, useState } from 'react';
import { Table, Button, Tag, Input, Select, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import { getAdaptations } from '@/api/adaptation';

interface AdaptTask {
  id: string;
  name: string;
  image_name: string;
  device_name: string;
  test_mode: string;
  status: string;
  created_at: string;
  save_image: boolean;
}

export default function AdaptationList() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdaptTask[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await getAdaptations({ page: 1, page_size: 100 });
        const payload = res?.data?.data || res?.data || res;
        const items = payload?.items || [];
        setData(
          Array.isArray(items)
            ? items.map((item: any) => ({
                id: String(item.id),
                name: item.name,
                image_name: item.image_name || '-',
                device_name: `${item.device_type} x${item.device_count}`,
                test_mode: item.test_mode,
                status: item.status,
                created_at: item.created_at || '-',
                save_image: Boolean(item.save_image),
              }))
            : [],
        );
      } catch {
        message.error('加载适配任务失败');
        setData([]);
      }
    })();
  }, []);

  const columns: ColumnsType<AdaptTask> = [
    { title: '任务名称', dataIndex: 'name', key: 'name', render: (text) => <span style={{ fontWeight: 600 }}>{text}</span> },
    { title: '部署镜像', dataIndex: 'image_name', key: 'image_name' },
    { title: '设备', dataIndex: 'device_name', key: 'device_name' },
    { title: '测试模式', dataIndex: 'test_mode', key: 'test_mode' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={status === 'running' ? 'blue' : 'gold'}>{status === 'running' ? '运行中' : '待执行'}</Tag>,
    },
    {
      title: '镜像保存',
      dataIndex: 'save_image',
      key: 'save_image',
      render: (save: boolean) => <Tag color={save ? 'gold' : 'default'}>{save ? '已保存' : '未保存'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
  ];

  return (
    <div>
      <PageHeader
        title="适配任务"
        breadcrumbs={[{ title: '适配系统', path: '/adaptation/list' }, { title: '适配任务' }]}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/adaptation/create')}>
            新建适配
          </Button>
        }
      />

      <div className="tech-filter-bar">
        <Input placeholder="搜索任务名称" prefix={<SearchOutlined />} style={{ width: 240 }} />
        <Select
          placeholder="状态筛选"
          style={{ width: 160 }}
          allowClear
          options={[
            { label: '待执行', value: 'pending' },
            { label: '运行中', value: 'running' },
          ]}
        />
      </div>

      <div className="tech-panel" style={{ padding: 12 }}>
        <Table columns={columns} dataSource={data} rowKey="id" pagination={{ showSizeChanger: true }} />
      </div>
    </div>
  );
}
