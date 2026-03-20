import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Divider, Typography } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';

const { Title, Paragraph, Text } = Typography;

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report] = useState({
    id,
    title: 'ResNet50 性能评测报告',
    type: 'performance',
    status: 'completed',
    eval_name: 'ResNet50 性能测试',
    creator: '张三',
    created_at: '2024-01-15 12:00:00',
    summary: '本次评测对 ResNet50 模型在 NVIDIA A100 GPU 上的推理性能进行了全面测试。结果显示，在 batch_size=32 条件下，平均推理延迟为 2.3ms，吞吐量达到 1234 samples/s，满足生产环境部署要求。',
    metrics: [
      { name: '平均推理延迟', value: '2.3ms' },
      { name: '吞吐量', value: '1234 samples/s' },
      { name: 'P99 延迟', value: '5.1ms' },
      { name: 'GPU 利用率', value: '95.2%' },
      { name: '显存占用', value: '4.2 GB' },
    ],
  });

  return (
    <div>
      <PageHeader
        title="报告详情"
        breadcrumbs={[
          { title: '报告管理', path: '/reports/list' },
          { title: '评测报告', path: '/reports/list' },
          { title: report.title },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/reports/list')}>返回</Button>
            <Button icon={<PrinterOutlined />}>打印</Button>
            <Button type="primary" icon={<DownloadOutlined />}>下载报告</Button>
          </Space>
        }
      />

      <Card style={{ borderRadius: 8, marginBottom: 16 }}>
        <Title level={3} style={{ textAlign: 'center', color: '#1B3A6B' }}>{report.title}</Title>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Space>
            <Tag color="blue">性能报告</Tag>
            <Tag color="green">已完成</Tag>
            <Text type="secondary">生成时间：{report.created_at}</Text>
          </Space>
        </div>

        <Divider />

        <Title level={4}>概述</Title>
        <Paragraph>{report.summary}</Paragraph>

        <Divider />

        <Title level={4}>核心指标</Title>
        <Descriptions bordered column={2}>
          {report.metrics.map((m, i) => (
            <Descriptions.Item key={i} label={m.name}>
              <Text strong style={{ color: '#1B3A6B', fontSize: 16 }}>{m.value}</Text>
            </Descriptions.Item>
          ))}
        </Descriptions>

        <Divider />

        <Title level={4}>测试环境</Title>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="GPU">NVIDIA A100 40GB</Descriptions.Item>
          <Descriptions.Item label="驱动版本">535.86.10</Descriptions.Item>
          <Descriptions.Item label="CUDA版本">12.2</Descriptions.Item>
          <Descriptions.Item label="框架">PyTorch 2.1.0</Descriptions.Item>
          <Descriptions.Item label="操作系统">Ubuntu 22.04</Descriptions.Item>
          <Descriptions.Item label="CPU">AMD EPYC 7543 32核</Descriptions.Item>
        </Descriptions>

        <Divider />

        <div style={{ textAlign: 'center', padding: '40px 0', background: '#f6f8fa', borderRadius: 8, marginTop: 24 }}>
          <Text type="secondary">📊 性能图表区域（集成图表库后可展示详细性能曲线）</Text>
        </div>
      </Card>
    </div>
  );
}
