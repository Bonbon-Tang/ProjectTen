import { useState } from 'react';
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
import { REPORT_TYPES } from '@/utils/constants';

interface ReportItem {
  id: string;
  title: string;
  type: string;
  status: string;
  eval_name: string;
  created_at: string;
  creator: string;
}

export default function ReportList() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [loading, setLoading] = useState(false);
  const [data] = useState<ReportItem[]>([
    { id: '1', title: 'ResNet50 性能评测报告', type: 'performance', status: 'completed', eval_name: 'ResNet50 性能测试', created_at: '2024-01-15', creator: '张三' },
    { id: '2', title: 'BERT 精度测试报告', type: 'accuracy', status: 'completed', eval_name: 'BERT 精度验证', created_at: '2024-01-14', creator: '李四' },
    { id: '3', title: 'GPU性能对比报告', type: 'comparison', status: 'generating', eval_name: '-', created_at: '2024-01-14', creator: '王五' },
    { id: '4', title: 'Q4综合评测报告', type: 'comprehensive', status: 'completed', eval_name: '-', created_at: '2024-01-13', creator: '张三' },
  ]);

  const reportStatusMap: Record<string, { label: string; color: string }> = {
    generating: { label: '生成中', color: 'processing' },
    completed: { label: '已完成', color: 'success' },
    failed: { label: '生成失败', color: 'error' },
  };

  const columns: ColumnsType<ReportItem> = [
    {
      title: '报告标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/reports/${record.id}`)} style={{ fontWeight: 500 }}>
          {text}
        </a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const found = REPORT_TYPES.find((t) => t.value === type);
        return <Tag>{found?.label || type}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const s = reportStatusMap[status];
        return s ? <Tag color={s.color}>{s.label}</Tag> : <Tag>{status}</Tag>;
      },
    },
    { title: '关联评测', dataIndex: 'eval_name', key: 'eval_name' },
    { title: '创建人', dataIndex: 'creator', key: 'creator' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
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

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input placeholder="搜索报告" prefix={<SearchOutlined />} style={{ width: 260 }} allowClear />
        <Select placeholder="类型筛选" style={{ width: 140 }} allowClear options={REPORT_TYPES} />
        <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
      </div>

      {viewMode === 'table' ? (
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
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
                  title={item.title}
                  description={
                    <Space direction="vertical" size={4}>
                      <Tag>{REPORT_TYPES.find((t) => t.value === item.type)?.label}</Tag>
                      <span style={{ fontSize: 12, color: '#999' }}>{item.created_at}</span>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
