import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Divider,
  Typography,
  Spin,
  Table,
  Row,
  Col,
  Statistic,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  PrinterOutlined,
  SaveOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import { getReportById, archiveReport, shareReport } from '@/api/reports';
import { DEVICE_TYPES } from '@/utils/constants';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [parsedContent, setParsedContent] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getReportById(id)
      .then((res: any) => {
        const data = res?.data || res;
        setReport(data);
        // Parse content JSON
        if (data?.content) {
          try {
            const content = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            setParsedContent(content);
          } catch {
            setParsedContent(null);
          }
        }
      })
      .catch(() => {
        message.error('加载报告失败');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleArchive = async () => {
    try {
      await archiveReport(id!);
      message.success('已保存到个人存档');
    } catch {
      message.error('保存存档失败');
    }
  };

  const handleShare = async () => {
    try {
      const nextValue = !report?.is_public;
      await shareReport(String(id), nextValue);
      setReport((prev: any) => (prev ? { ...prev, is_public: nextValue } : prev));
      message.success(nextValue ? '已设为全平台公开' : '已设为私有');
    } catch {
      message.error('更新报告可见性失败');
    }
  };

  const handleDownload = () => {
    if (!report || !parsedContent) {
      message.warning('报告数据尚未加载');
      return;
    }
    // Generate downloadable JSON report
    const reportData = {
      report_id: report.id,
      title: report.title,
      report_type: report.report_type,
      status: report.status,
      created_at: report.created_at,
      ...parsedContent,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `评测报告-${report.title || report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('报告已下载');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="加载报告中..." />
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
        报告不存在或加载失败
      </div>
    );
  }

  const content = parsedContent || {};
  const metrics = content.metrics || {};
  const isOperatorTest = content.task_category === 'operator_test';
  const isAccuracyAndPerf = content.task_type === 'operator_perf_accuracy';
  const operatorResults = metrics.operator_results || [];
  const device = DEVICE_TYPES.find((d) => d.value === content.device_type);
  const durationMin = content.duration_seconds ? (content.duration_seconds / 60).toFixed(1) : null;

  // Operator results table columns
  const operatorColumns: ColumnsType<any> = [
    {
      title: '算子名称',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 140,
      fixed: 'left',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (val: string) => <Tag>{val}</Tag>,
    },
    {
      title: 'FP32精度',
      key: 'fp32_acc',
      width: 100,
      render: (_: any, r: any) => r.accuracy?.fp32_accuracy?.toFixed(4) ?? '-',
    },
    {
      title: 'FP16精度',
      key: 'fp16_acc',
      width: 100,
      render: (_: any, r: any) => r.accuracy?.fp16_accuracy?.toFixed(4) ?? '-',
    },
    {
      title: 'INT8精度',
      key: 'int8_acc',
      width: 100,
      render: (_: any, r: any) => r.accuracy?.int8_accuracy?.toFixed(4) ?? '-',
    },
    {
      title: '精度损失率',
      key: 'loss_rate',
      width: 120,
      render: (_: any, r: any) => {
        const val = r.accuracy?.int8_loss_rate;
        if (val == null) return '-';
        let color = '#fa8c16';
        if (val < 1) color = '#52c41a';
        if (val > 5) color = '#ff4d4f';
        return <span style={{ color, fontWeight: 600 }}>{val.toFixed(2)}%</span>;
      },
    },
    {
      title: '通过',
      key: 'pass',
      width: 70,
      render: (_: any, r: any) =>
        r.accuracy?.pass ? (
          <CheckCircleFilled style={{ color: '#52c41a' }} />
        ) : (
          <CloseCircleFilled style={{ color: '#ff4d4f' }} />
        ),
    },
  ];

  // Add performance columns if operator_perf_accuracy
  if (isAccuracyAndPerf) {
    operatorColumns.push(
      {
        title: '测试FP16延迟(μs)',
        key: 'tested_fp16',
        width: 140,
        render: (_: any, r: any) => r.performance?.tested_fp16_latency_us?.toFixed(1) ?? '-',
      },
      {
        title: 'H100 FP16延迟(μs)',
        key: 'h100_fp16',
        width: 140,
        render: (_: any, r: any) => r.performance?.h100_fp16_latency_us?.toFixed(1) ?? '-',
      },
      {
        title: '测试吞吐量(GOPS)',
        key: 'tested_throughput',
        width: 150,
        render: (_: any, r: any) => r.performance?.tested_throughput_gops?.toFixed(1) ?? '-',
      },
      {
        title: 'H100吞吐量(GOPS)',
        key: 'h100_throughput',
        width: 150,
        render: (_: any, r: any) => r.performance?.h100_throughput_gops?.toFixed(1) ?? '-',
      },
    );
  }

  // Model metrics rendering
  const renderModelMetrics = () => {
    if (isOperatorTest || !metrics) return null;
    const metricItems = Object.entries(metrics)
      .filter(([k]) => !['operator_results'].includes(k))
      .map(([k, v]) => ({
        name: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: typeof v === 'number' ? (v as number).toFixed(2) : String(v),
      }));
    return (
      <Descriptions bordered column={2} size="small">
        {metricItems.map((m, i) => (
          <Descriptions.Item key={i} label={m.name}>
            <Text strong style={{ color: '#1B3A6B', fontSize: 16 }}>{m.value}</Text>
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

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
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
            <Button icon={<SaveOutlined />} onClick={handleArchive}>保存存档</Button>
            <Button icon={<ShareAltOutlined />} onClick={handleShare}>
              {report?.is_public ? '设为私有' : '设为全平台'}
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>打印</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>下载报告</Button>
          </Space>
        }
      />

      {/* 报告头部 */}
      <Card style={{ borderRadius: 8, marginBottom: 16 }}>
        <Title level={3} style={{ textAlign: 'center', color: '#1B3A6B' }}>{report.title}</Title>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Space>
            <Tag color="blue">{isOperatorTest ? '算子测试报告' : '模型测试报告'}</Tag>
            <Tag color={report?.is_public ? 'cyan' : 'default'}>{report?.is_public ? '全平台' : '私有'}</Tag>
            <Tag color="green">{report.status === 'published' ? '已发布' : report.status}</Tag>
            <Text type="secondary">生成时间：{dayjs(report.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
          </Space>
        </div>

        <Divider />

        {/* 概述 */}
        <Title level={4}>概述</Title>
        <Paragraph>{content.conclusion || '评测任务已完成。'}</Paragraph>

        <Divider />

        {/* 测试环境 */}
        <Title level={4}>测试配置</Title>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="任务名称">{content.task_name}</Descriptions.Item>
          <Descriptions.Item label="评测类型">
            {isOperatorTest
              ? (content.task_type === 'operator_perf_accuracy' ? '精度+性能' : '精度测试')
              : content.task_type
            }
          </Descriptions.Item>
          <Descriptions.Item label="设备类型">
            <span style={{ color: device?.color, fontWeight: 500 }}>
              {device?.label || content.device_type || '-'}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="设备数量">{content.device_count ?? '-'} 台</Descriptions.Item>
          {content.operator_lib && (
            <Descriptions.Item label="算子库">
              <Tag color="purple">{content.operator_lib}</Tag>
            </Descriptions.Item>
          )}
          {content.operator_count != null && (
            <Descriptions.Item label="测试算子数">{content.operator_count} 个</Descriptions.Item>
          )}
          {durationMin && (
            <Descriptions.Item label="测试耗时">{durationMin} 分钟</Descriptions.Item>
          )}
          <Descriptions.Item label="开始时间">
            {content.started_at ? dayjs(content.started_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="完成时间">
            {content.completed_at ? dayjs(content.completed_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* 算子测试结果 */}
        {isOperatorTest && operatorResults.length > 0 && (
          <>
            <Title level={4}>算子测试结果</Title>
            {/* 汇总统计 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 8, background: '#f6f9ff' }}>
                  <Statistic title="测试算子数" value={metrics.total_ops_tested} valueStyle={{ color: '#1B3A6B', fontSize: 24, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 8, background: '#f6f9ff' }}>
                  <Statistic title="通过数" value={metrics.passed_ops} valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 8, background: '#f6f9ff' }}>
                  <Statistic title="通过率" value={metrics.pass_rate} suffix="%" precision={1} valueStyle={{ color: metrics.all_pass ? '#52c41a' : '#fa8c16', fontSize: 24, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 8, background: '#f6f9ff' }}>
                  <Statistic title="FP16平均损失" value={metrics.avg_fp16_loss_rate} suffix="%" precision={2} valueStyle={{ color: metrics.avg_fp16_loss_rate < 1 ? '#52c41a' : '#fa8c16', fontSize: 24, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 8, background: '#f6f9ff' }}>
                  <Statistic title="INT8平均损失" value={metrics.avg_int8_loss_rate} suffix="%" precision={2} valueStyle={{ color: metrics.avg_int8_loss_rate < 3 ? '#52c41a' : '#fa8c16', fontSize: 24, fontWeight: 700 }} />
                </Card>
              </Col>
            </Row>

            {/* 算子逐项结果表 */}
            <Table
              columns={operatorColumns}
              dataSource={operatorResults.map((r: any, i: number) => ({ ...r, _key: r.operator_id || i }))}
              rowKey="_key"
              size="small"
              scroll={{ x: isAccuracyAndPerf ? 1400 : 800 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个算子`,
              }}
            />
          </>
        )}

        {/* 模型测试结果 */}
        {!isOperatorTest && metrics && (
          <>
            <Title level={4}>模型测试结果</Title>
            {renderModelMetrics()}
          </>
        )}
      </Card>
    </div>
  );
}
