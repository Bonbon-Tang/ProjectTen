import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Space, Input, Select, Tag, Row, Col, Radio, Empty } from 'antd';
import {
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  StarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { EVAL_CATEGORIES, DEVICE_TYPES } from '@/utils/constants';
import { getReports } from '@/api/reports';
import dayjs from 'dayjs';

interface ReportItem {
  id: string;
  name: string;
  task_category: string;
  task_type: string;
  device_type: string;
  status: string;
  eval_name: string;
  created_at: string;
  creator: string;
  progress?: number;
}

// 合并子类型用于显示
const ALL_SUB_TYPES = [
  { label: '测精度', value: 'accuracy_only' },
  { label: '测精度 + 性能', value: 'accuracy_and_performance' },
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

export default function ReportList() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState<{
    status?: string;
    task_category?: string;
    device_type?: string;
    keyword?: string;
  }>({});

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res: any = await getReports({
        ...filters,
        page: pagination.current,
        page_size: pagination.pageSize,
      });
      const resData = res?.data || res;
      const items = resData?.items || resData?.list || [];
      if (Array.isArray(items)) {
        setData(items);
        setPagination((prev) => ({
          ...prev,
          total: resData?.total ?? items.length,
        }));
      }
    } catch {
      // 静默处理，使用空数据
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filters, pagination.current, pagination.pageSize]);

  const columns: ColumnsType<ReportItem> = [
    {
      title: '报告名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/reports/${record.id}`)} style={{ fontWeight: 500 }}>
          {text}
        </a>
      ),
    },
    {
      title: '评测大类',
      dataIndex: 'task_category',
      key: 'task_category',
      width: 110,
      render: (val: string) => {
        const cat = EVAL_CATEGORIES.find((c) => c.value === val);
        return cat ? <Tag>{cat.icon} {cat.label}</Tag> : <Tag>{val}</Tag>;
      },
    },
    {
      title: '子场景',
      dataIndex: 'task_type',
      key: 'task_type',
      width: 140,
      render: (val: string) => <Tag color="geekblue">{getSubTypeLabel(val)}</Tag>,
    },
    {
      title: '设备类型',
      dataIndex: 'device_type',
      key: 'device_type',
      width: 140,
      render: (val: string) => {
        const d = DEVICE_TYPES.find((dv) => dv.value === val);
        return d ? <span style={{ color: d.color, fontWeight: 500 }}>{d.label}</span> : val;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string, record) => (
        <StatusTag status={status} progress={record.progress} />
      ),
    },
    { title: '关联评测', dataIndex: 'eval_name', key: 'eval_name', ellipsis: true },
    { title: '创建人', dataIndex: 'creator', key: 'creator' },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/reports/${record.id}`)}>查看</Button>
          <Button type="link" size="small" icon={<StarOutlined />}>存档</Button>
          <Button type="link" size="small" icon={<DownloadOutlined />}>下载</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="评测报告"
        breadcrumbs={[{ title: '报告管理', path: '/reports/list' }, { title: '评测报告' }]}
        extra={
          <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <Radio.Button value="table"><UnorderedListOutlined /></Radio.Button>
            <Radio.Button value="card"><AppstoreOutlined /></Radio.Button>
          </Radio.Group>
        }
      />
      <div style={{ marginBottom: 16, color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
        查看所有可见的评测报告列表
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
        <Select
          placeholder="状态筛选"
          style={{ width: 140 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, status: value })}
          options={[
            { label: '待执行', value: 'pending' },
            { label: '排队中', value: 'queued' },
            { label: '运行中', value: 'running' },
            { label: '已完成', value: 'completed' },
            { label: '失败', value: 'failed' },
            { label: '已终止', value: 'terminated' },
          ]}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetchReports}>
          搜索
        </Button>
      </div>

      {viewMode === 'table' ? (
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
        />
      ) : (
        <Row gutter={[16, 16]}>
          {data.map((item) => (
            <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
              <Card
                hoverable
                style={{ borderRadius: 8 }}
                cover={
                  <div
                    style={{
                      height: 160,
                      background: 'linear-gradient(135deg, #1B3A6B, #2196F3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileTextOutlined style={{ fontSize: 48, color: '#fff' }} />
                  </div>
                }
                onClick={() => navigate(`/reports/${item.id}`)}
              >
                <Card.Meta
                  title={item.name}
                  description={
                    <Space direction="vertical" size={4}>
                      <Tag>{EVAL_CATEGORIES.find((c) => c.value === item.task_category)?.label}</Tag>
                      <span style={{ fontSize: 12, color: '#999' }}>
                        {dayjs(item.created_at).format('YYYY-MM-DD')}
                      </span>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {data.length === 0 && !loading && (
        <Empty description="暂无评测报告" style={{ padding: '60px 0' }} />
      )}
    </div>
  );
}
