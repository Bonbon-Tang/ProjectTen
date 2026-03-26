import { useEffect, useState } from 'react';
import { Table, Button, Tag, Input, Modal, Select, Space, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import { getAdaptations, setAdaptationPostActions } from '@/api/adaptation';

interface AdaptTask {
  id: string;
  name: string;
  image_name: string;
  device_name: string;
  test_mode: string;
  status: string;
  created_at: string;
  save_image: boolean;
  saved_image_name?: string;
  config?: Record<string, any>;
  tags: string[];
  result?: {
    summary?: string;
    accuracy?: number;
    accuracy_metric?: string;
    performance_score?: number;
    software_completeness_score?: number;
    avg_latency_ms?: number;
    throughput?: number;
    throughput_unit?: string;
    energy_efficiency?: number;
    energy_efficiency_unit?: string;
    progress?: number;
    success?: boolean;
    message?: string;
  };
}

export default function AdaptationList() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdaptTask[]>([]);

  const fetchData = async () => {
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
              saved_image_name: item.saved_image_name,
              config: item.config || {},
              tags: Array.isArray(item.tags) ? item.tags : [],
              result: item.result,
            }))
          : [],
      );
    } catch {
      message.error('加载适配任务失败');
      setData([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePostAction = async (
    record: AdaptTask,
    patch: { save_image?: boolean; include_in_ranking?: boolean; saved_image_name?: string },
  ) => {
    try {
      await setAdaptationPostActions(record.id, {
        save_image: patch.save_image ?? Boolean(record.save_image),
        include_in_ranking: patch.include_in_ranking ?? (record.config?.include_in_ranking ?? true),
        saved_image_name: patch.saved_image_name,
      });
      message.success('设置已更新');
      fetchData();
    } catch {
      message.error('设置更新失败');
    }
  };

  const handleSaveImage = (record: AdaptTask) => {
    let draftName = record.saved_image_name || `${record.image_name}-adapted-${record.id}`;
    Modal.confirm({
      title: '保存镜像',
      content: (
        <div>
          <div style={{ marginBottom: 8, color: '#5f7694' }}>请确认新镜像名称，保存后可在资产列表中查看。</div>
          <Input defaultValue={draftName} onChange={(e) => { draftName = e.target.value; }} />
        </div>
      ),
      okText: '确认保存',
      cancelText: '取消',
      onOk: async () => {
        if (!draftName.trim()) {
          message.warning('请输入新镜像名称');
          throw new Error('empty image name');
        }
        await handleTogglePostAction(record, {
          save_image: true,
          saved_image_name: draftName.trim(),
        });
      },
    });
  };

  const columns: ColumnsType<AdaptTask> = [
    { title: '任务名称', dataIndex: 'name', key: 'name', render: (text) => <span style={{ fontWeight: 600 }}>{text}</span> },
    { title: '部署镜像', dataIndex: 'image_name', key: 'image_name' },
    { title: '设备', dataIndex: 'device_name', key: 'device_name' },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => tags?.length ? <Space wrap>{tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space> : '-',
    },
    { title: '测试模式', dataIndex: 'test_mode', key: 'test_mode' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'completed' ? 'green' : status === 'running' ? 'blue' : status === 'failed' ? 'red' : 'gold';
        const text = status === 'completed' ? '已完成' : status === 'running' ? '运行中' : status === 'failed' ? '失败' : '待执行';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '镜像保存',
      dataIndex: 'save_image',
      key: 'save_image',
      render: (save: boolean, record) => (
        <Space direction="vertical" size={0}>
          <Tag color={save ? 'gold' : 'default'}>{save ? '已保存' : '未保存'}</Tag>
          {save && record.saved_image_name ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: 'auto' }}
              onClick={() => navigate(`/assets/list?keyword=${encodeURIComponent(record.saved_image_name || '')}`)}
            >
              {record.saved_image_name}
            </Button>
          ) : null}
        </Space>
      ),
    },
    {
      title: '参与榜单',
      dataIndex: 'config',
      key: 'include_in_ranking',
      render: (config: Record<string, any> | undefined, record) => {
        const included = config?.include_in_ranking ?? true;
        return record.status === 'completed' ? (
          <Button
            size="small"
            type={included ? 'default' : 'primary'}
            onClick={() => handleTogglePostAction(record, { include_in_ranking: !included })}
          >
            {included ? '取消参与' : '参与榜单'}
          </Button>
        ) : (
          <Tag color={included ? 'blue' : 'default'}>{included ? '参与' : '不参与'}</Tag>
        );
      },
    },
    {
      title: '最终结果',
      dataIndex: 'result',
      key: 'result',
      render: (result?: AdaptTask['result']) => {
        if (!result) return '-';
        if (result.message && !result.summary) return result.message;
        return (
          <Space direction="vertical" size={0}>
            <span>{result.summary || result.message || '-'}</span>
            {typeof result.accuracy === 'number' && (
              <span style={{ color: '#5f7694', fontSize: 12 }}>
                准确率 {result.accuracy}% / 性能评分 {result.performance_score}
              </span>
            )}
            {typeof result.progress === 'number' && (
              <span style={{ color: '#5f7694', fontSize: 12 }}>
                当前进度 {result.progress}%
              </span>
            )}
          </Space>
        );
      },
    },
    {
      title: '保存镜像',
      key: 'save_image_action',
      render: (_: any, record) => {
        const saved = Boolean(record.save_image);
        return record.status === 'completed' ? (
          <Button
            size="small"
            type={saved ? 'default' : 'primary'}
            onClick={() => {
              if (saved) {
                message.info('该镜像已保存，可前往资产列表查看');
                return;
              }
              handleSaveImage(record);
            }}
          >
            {saved ? '已保存' : '保存镜像'}
          </Button>
        ) : '-';
      },
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
