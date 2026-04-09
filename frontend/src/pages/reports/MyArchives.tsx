import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Popconfirm, message, Tag, Input, Select } from 'antd';
import { SearchOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { EVAL_CATEGORIES, DEVICE_TYPES } from '@/utils/constants';
import { getArchives, deleteArchive } from '@/api/reports';
import dayjs from 'dayjs';

interface ArchiveItem {
  id: number;
  user_id: number;
  report_id: number;
  note?: string;
  archived_at?: string;
  // 关联的报告信息
  report_title?: string;
  report_type?: string;
  report_status?: string;
  task_id?: number;
  // 从 task 关联的数据
  eval_name?: string;
  task_category?: string;
  task_type?: string;
  device_type?: string;
  progress?: number;
  // Image and model info
  image_name?: string;
  model_name?: string;
  chip_name?: string;
  framework_name?: string;
}

// 合并子类型用于显示
const ALL_SUB_TYPES = [
  { label: '测精度', value: 'operator_accuracy' },
  { label: '测精度 + 性能', value: 'operator_perf_accuracy' },
  { label: '大语言模型', value: 'llm' },
  { label: '多模态模型', value: 'multimodal' },
  { label: '语音识别', value: 'speech_recognition' },
  { label: '图像分类', value: 'image_classification' },
  { label: '目标检测', value: 'object_detection' },
  { label: '语义分割', value: 'semantic_segmentation' },
  { label: '文本生成', value: 'text_generation' },
  { label: '机器翻译', value: 'machine_translation' },
  { label: '情感分析', value: 'sentiment_analysis' },
  { label: '问答系统', value: 'question_answering' },
  { label: '文本摘要', value: 'text_summarization' },
  { label: '语音合成', value: 'speech_synthesis' },
  { label: '图像生成', value: 'image_generation' },
  { label: '视频理解', value: 'video_understanding' },
  { label: '文字识别 (OCR)', value: 'ocr' },
  { label: '推荐系统', value: 'recommendation' },
  { label: '异常检测', value: 'anomaly_detection' },
  { label: '时序预测', value: 'time_series' },
  { label: '强化学习', value: 'reinforcement_learning' },
  { label: '图神经网络', value: 'graph_neural_network' },
  { label: '医学影像', value: 'medical_imaging' },
  { label: '自动驾驶', value: 'autonomous_driving' },
  { label: '机器人控制', value: 'robot_control' },
  { label: '代码生成', value: 'code_generation' },
  { label: '知识图谱', value: 'knowledge_graph' },
];

function getSubTypeLabel(val: string): string {
  return ALL_SUB_TYPES.find((t) => t.value === val)?.label || val;
}

export default function MyArchives() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ArchiveItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState<{
    task_category?: string;
    device_type?: string;
    keyword?: string;
  }>({});

  const fetchArchives = async () => {
    setLoading(true);
    try {
      const res: any = await getArchives({
        page: pagination.current,
        page_size: pagination.pageSize,
      });
      const resData = res?.data || res;
      const items = resData?.items || resData?.data || resData?.list || resData || [];
      if (Array.isArray(items)) {
        setData(items);
        setPagination((prev) => ({
          ...prev,
          total: resData?.total ?? items.length,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch archives:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives();
  }, [filters.task_category, filters.device_type, pagination.current, pagination.pageSize]);

  const handleDelete = async (id: number) => {
    try {
      await deleteArchive(String(id));
      message.success('已取消存档');
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch {
      message.error('取消存档失败');
    }
  };

  const columns: ColumnsType<ArchiveItem> = [
    {
      title: '报告名称',
      dataIndex: 'eval_name',
      key: 'eval_name',
      ellipsis: true,
      render: (text: string, record) => (
        <a onClick={() => navigate(`/reports/${record.report_id}`)} style={{ fontWeight: 500 }}>
          {text || record.report_title || `报告 #${record.report_id}`}
        </a>
      ),
    },
    {
      title: '评测大类',
      dataIndex: 'task_category',
      key: 'task_category',
      width: 120,
      render: (val: string) => {
        const cat = EVAL_CATEGORIES.find((c) => c.value === val);
        return cat ? <Tag>{cat.icon} {cat.label}</Tag> : <Tag>{val || '-'}</Tag>;
      },
    },
    {
      title: '子场景',
      dataIndex: 'task_type',
      key: 'task_type',
      width: 150,
      render: (val: string) => {
        if (!val) return <span style={{ color: '#999' }}>-</span>;
        return <Tag color="geekblue">{getSubTypeLabel(val)}</Tag>;
      },
    },
    {
      title: '设备类型',
      dataIndex: 'device_type',
      key: 'device_type',
      width: 140,
      render: (val: string) => {
        const d = DEVICE_TYPES.find((dv) => dv.value === val);
        return d ? <span style={{ color: d.color, fontWeight: 500 }}>{d.label}</span> : <span style={{ color: '#999' }}>{val || '-'}</span>;
      },
    },
    {
      title: '模型',
      dataIndex: 'model_name',
      key: 'model_name',
      width: 120,
      render: (val: string, record) => {
        if (!val) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Space direction="vertical" size={0}>
            <span style={{ fontWeight: 500 }}>{val}</span>
            {record.framework_name && (
              <span style={{ fontSize: 11, color: '#999' }}>{record.framework_name}</span>
            )}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'report_status',
      key: 'report_status',
      width: 130,
      render: (status: string, record) => (
        <StatusTag status={status || 'published'} progress={record.progress} />
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      width: 200,
      ellipsis: true,
      render: (text: string) => text || <span style={{ color: '#ccc' }}>无</span>,
    },
    {
      title: '存档时间',
      dataIndex: 'archived_at',
      key: 'archived_at',
      width: 170,
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/reports/${record.report_id}`)}
          >
            查看
          </Button>
          <Popconfirm title="确定取消存档？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              取消存档
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="我的存档"
        breadcrumbs={[{ title: '报告管理', path: '/reports/list' }, { title: '我的存档' }]}
      />
      <div style={{ marginBottom: 16, color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
        查看您收藏和归档的评测报告
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Input
          placeholder="搜索报告名称"
          prefix={<SearchOutlined />}
          style={{ width: 240 }}
          allowClear
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
        />
        <Select
          placeholder="评测大类"
          style={{ width: 140 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, task_category: value })}
          options={EVAL_CATEGORIES.map((c) => ({ label: `${c.icon} ${c.label}`, value: c.value }))}
        />
        <Select
          placeholder="设备类型"
          style={{ width: 160 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, device_type: value })}
          options={DEVICE_TYPES.map((d) => ({ label: d.label, value: d.value }))}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetchArchives}>
          搜索
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
        }}
        locale={{ emptyText: '暂无存档报告' }}
      />
    </div>
  );
}
