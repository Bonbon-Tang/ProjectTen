import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Col, Descriptions, List, Row, Space, Spin, Statistic, Tag, Timeline, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { getAdaptationById, getAdaptationLogs } from '@/api/adaptation';

const { Text, Paragraph } = Typography;

export default function AdaptationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [detailRes, logsRes]: any = await Promise.all([
          getAdaptationById(id!),
          getAdaptationLogs(id!),
        ]);
        setDetail(detailRes?.data?.data || detailRes?.data || detailRes);
        setLogs(logsRes?.data?.data?.logs || logsRes?.data?.logs || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <Spin size="large" />;
  if (!detail) return <div>未找到适配任务</div>;

  const result = detail.result || {};
  const metrics = detail.metrics || result.evaluation_detail || {};
  const actions = detail.actions || result.adaptation_detail?.actions || [];

  return (
    <div>
      <PageHeader
        title={detail.name}
        breadcrumbs={[
          { title: '适配系统', path: '/adaptation/list' },
          { title: '适配任务', path: '/adaptation/list' },
          { title: detail.name },
        ]}
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/adaptation/list')}>返回</Button>}
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="状态"><Tag color={detail.status === 'completed' ? 'green' : detail.status === 'failed' ? 'red' : 'blue'}>{detail.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="镜像">{detail.image_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="设备">{detail.device_type} x{detail.device_count}</Descriptions.Item>
          <Descriptions.Item label="精度">{detail.precision}</Descriptions.Item>
          <Descriptions.Item label="测试模式">{detail.test_mode}</Descriptions.Item>
          <Descriptions.Item label="执行阶段">{detail.run?.stage || result.stage || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="准确率" value={metrics.accuracy} suffix={metrics.accuracy ? '%' : ''} precision={2} /></Card></Col>
        <Col span={6}><Card><Statistic title="平均延迟(ms)" value={metrics.avg_latency_ms} precision={1} /></Card></Col>
        <Col span={6}><Card><Statistic title="吞吐量" value={metrics.throughput} precision={1} suffix={metrics.throughput_unit || ''} /></Card></Col>
        <Col span={6}><Card><Statistic title="性能评分" value={metrics.performance_score} precision={1} /></Card></Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="适配细节" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="适配前配置">
                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.adaptation_detail?.before || {}, null, 2)}</pre>
              </Descriptions.Item>
              <Descriptions.Item label="适配后配置">
                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.adaptation_detail?.after || {}, null, 2)}</pre>
              </Descriptions.Item>
            </Descriptions>
            <Timeline
              items={actions.map((action: any) => ({
                color: action.status === 'completed' ? 'green' : 'blue',
                children: (
                  <div>
                    <Text strong>{action.step_no}. {action.title}</Text>
                    <Paragraph type="secondary" style={{ marginBottom: 4 }}>{action.reason}</Paragraph>
                    <div style={{ fontSize: 12 }}>
                      <div>Before: <code>{JSON.stringify(action.before_value)}</code></div>
                      <div>After: <code>{JSON.stringify(action.after_value)}</code></div>
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="执行与评测细节" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="执行上下文">
                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.execution_detail || detail.run?.resource_snapshot || {}, null, 2)}</pre>
              </Descriptions.Item>
              <Descriptions.Item label="结论">
                <Paragraph>{result.conclusion?.summary || result.summary || '-'}</Paragraph>
                <Text type="secondary">{result.conclusion?.recommended_next_step || '-'}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="运行日志">
            <List
              size="small"
              dataSource={logs}
              renderItem={(item: any) => (
                <List.Item>
                  <Space direction="vertical" size={0}>
                    <Text code>{item.timestamp}</Text>
                    <Text>{item.message}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
