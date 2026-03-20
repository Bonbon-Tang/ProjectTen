import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Progress,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Statistic,
  Popconfirm,
  message,
  Spin,
  Table,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SaveOutlined,
  FileTextOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import {
  EVAL_CATEGORIES,
  OPERATOR_TEST_TYPES,
  MODEL_TEST_TYPES,
  DEVICE_TYPES,
  PRIORITY_MAP,
} from '@/utils/constants';
import {
  getEvaluationById,
  startEvaluation,
  stopEvaluation,
  retryEvaluation,
  deleteEvaluation,
  getEvaluationLogs,
} from '@/api/evaluations';
import { archiveReport, downloadReport } from '@/api/reports';
import dayjs from 'dayjs';

const { Text } = Typography;

// 获取子类型标签
function getSubTypeLabel(category: string, taskType: string): string {
  const list = category === 'operator_test' ? OPERATOR_TEST_TYPES : MODEL_TEST_TYPES;
  return list.find((t) => t.value === taskType)?.label || taskType;
}

function getCategoryLabel(val: string): string {
  return EVAL_CATEGORIES.find((c) => c.value === val)?.label || val;
}

function getDeviceLabel(val: string) {
  return DEVICE_TYPES.find((d) => d.value === val);
}

interface OperatorResultItem {
  id: number;
  name: string;
  category: string;
  fp32_accuracy: number;
  fp16_accuracy: number;
  int8_accuracy: number;
  accuracy_loss_rate: number;
  device_latency?: number;
  h100_latency?: number;
  device_throughput?: number;
  h100_throughput?: number;
}

export default function EvalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [detail, setDetail] = useState<any>(null);

  const [logs, setLogs] = useState<string[]>([]);

  // 加载详情
  const fetchDetail = useCallback(async () => {
    try {
      const res: any = await getEvaluationById(id!);
      const data = res?.data || res;
      if (data && data.id) {
        setDetail(data);
      }
    } catch {
      // 使用 mock 数据作为 fallback
      if (!detail) {
        setDetail({
          id: id || '1',
          name: '评测任务',
          description: '',
          task_category: 'model_test',
          task_type: 'llm',
          status: 'running',
          priority: 'high',
          device_type: 'huawei_910c',
          device_count: 4,
          toolset_name: null,
          creator: '未知',
          created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          started_at: null,
          progress: 0,
          estimated_remaining: null,
          report_id: null,
          results: null,
          operator_results: null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 初始加载
  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // 运行中轮询 - 每3秒刷新进度
  useEffect(() => {
    if (!detail || detail.status !== 'running') {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const res: any = await getEvaluationById(id!);
        const data = res?.data || res;
        if (data && data.id) {
          setDetail(data);
          // 当进度到100且status=completed时停止轮询
          if (data.progress >= 100 && data.status === 'completed') {
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
          }
        }
      } catch {
        // 静默
      }
      // 获取新日志
      try {
        const logRes: any = await getEvaluationLogs(id!, { offset: logs.length, limit: 50 });
        const newLogs = logRes?.data?.logs || logRes?.logs || [];
        if (Array.isArray(newLogs) && newLogs.length > 0) {
          setLogs((prev) => [
            ...prev,
            ...newLogs.map((l: any) => (typeof l === 'string' ? l : l.message)),
          ]);
        }
      } catch {
        // 静默
      }
    }, 3000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [detail?.status, id]);

  // 日志自动滚动到底部
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 操作
  const handleStart = async () => {
    setActionLoading(true);
    try {
      await startEvaluation(id!);
      message.success('任务已启动');
      setDetail((prev: any) => ({ ...prev, status: 'running', progress: 0 }));
    } catch {
      message.error('启动失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      await stopEvaluation(id!);
      message.success('任务已停止');
      setDetail((prev: any) => ({ ...prev, status: 'terminated' }));
    } catch {
      message.error('停止失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      await retryEvaluation(id!);
      message.success('任务已重新启动');
      setDetail((prev: any) => ({ ...prev, status: 'queued', progress: 0 }));
    } catch {
      message.error('重试失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteEvaluation(id!);
      message.success('任务已删除');
      navigate('/evaluations/list');
    } catch {
      message.error('删除失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!detail.report_id) {
      message.warning('报告尚未生成');
      return;
    }
    try {
      await archiveReport(detail.report_id);
      message.success('已保存到个人存档');
    } catch {
      message.error('保存存档失败');
    }
  };

  const handleDownloadReport = async () => {
    if (!detail.report_id) {
      message.warning('报告尚未生成');
      return;
    }
    try {
      const res: any = await downloadReport(detail.report_id);
      // Response is JSON (from updated backend)
      const data = typeof res === 'string' ? res : (res?.data ? JSON.stringify(res.data, null, 2) : JSON.stringify(res, null, 2));
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `评测报告-${detail.name}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('报告已下载');
    } catch {
      message.error('下载失败');
    }
  };

  if (loading || !detail) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  const device = getDeviceLabel(detail.device_type);
  const priorityInfo = PRIORITY_MAP[detail.priority];
  const isCompleted = detail.status === 'completed';
  const isRunning = detail.status === 'running';
  const isFailed = detail.status === 'failed' || detail.status === 'terminated';
  const isOperatorTest = detail.task_category === 'operator_test';
  const isAccuracyAndPerf = detail.task_type === 'accuracy_and_performance';

  // 模型测试结果 - from metrics
  const modelResults =
    (!isOperatorTest && isCompleted && detail.metrics)
      ? detail.metrics
      : detail.results || null;

  // 算子测试结果 - parse from metrics.operator_results
  const operatorResults: OperatorResultItem[] = (() => {
    const raw = detail.metrics?.operator_results || detail.operator_results || detail.results?.operators || [];
    return raw.map((r: any, idx: number) => ({
      id: r.operator_id || idx,
      name: r.operator_name || r.name || '-',
      category: r.category || '-',
      fp32_accuracy: r.accuracy?.fp32_accuracy ?? r.fp32_accuracy,
      fp16_accuracy: r.accuracy?.fp16_accuracy ?? r.fp16_accuracy,
      int8_accuracy: r.accuracy?.int8_accuracy ?? r.int8_accuracy,
      accuracy_loss_rate: r.accuracy?.int8_loss_rate != null
        ? r.accuracy.int8_loss_rate / 100
        : r.accuracy_loss_rate,
      device_latency: r.performance?.tested_fp16_latency_us ?? r.device_latency,
      h100_latency: r.performance?.h100_fp16_latency_us ?? r.h100_latency,
      device_throughput: r.performance?.tested_throughput_gops ?? r.device_throughput,
      h100_throughput: r.performance?.h100_throughput_gops ?? r.h100_throughput,
    }));
  })();

  // 算子测试汇总
  const operatorSummary = detail.metrics ? {
    total: detail.metrics.total_ops_tested,
    passed: detail.metrics.passed_ops,
    passRate: detail.metrics.pass_rate,
    avgFp16Loss: detail.metrics.avg_fp16_loss_rate,
    avgInt8Loss: detail.metrics.avg_int8_loss_rate,
    allPass: detail.metrics.all_pass,
  } : null;

  // 算子结果表格列
  const getOperatorColumns = (): ColumnsType<OperatorResultItem> => {
    const baseCols: ColumnsType<OperatorResultItem> = [
      {
        title: '算子名称',
        dataIndex: 'name',
        key: 'name',
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
        dataIndex: 'fp32_accuracy',
        key: 'fp32_accuracy',
        width: 100,
        render: (val: number) => (val != null ? `${val.toFixed(4)}` : '-'),
      },
      {
        title: 'FP16精度',
        dataIndex: 'fp16_accuracy',
        key: 'fp16_accuracy',
        width: 100,
        render: (val: number) => (val != null ? `${val.toFixed(4)}` : '-'),
      },
      {
        title: 'INT8精度',
        dataIndex: 'int8_accuracy',
        key: 'int8_accuracy',
        width: 100,
        render: (val: number) => (val != null ? `${val.toFixed(4)}` : '-'),
      },
      {
        title: '精度损失率',
        dataIndex: 'accuracy_loss_rate',
        key: 'accuracy_loss_rate',
        width: 120,
        render: (val: number) => {
          if (val == null) return '-';
          const pct = val * 100;
          let color = '#fa8c16'; // yellow for 1-5%
          if (pct < 1) color = '#52c41a'; // green
          if (pct > 5) color = '#ff4d4f'; // red
          return (
            <span style={{ color, fontWeight: 600 }}>{pct.toFixed(2)}%</span>
          );
        },
      },
    ];

    // 如果是测精度+性能，增加延迟和吞吐量对比列
    if (isAccuracyAndPerf) {
      baseCols.push(
        {
          title: '本设备延迟(μs)',
          dataIndex: 'device_latency',
          key: 'device_latency',
          width: 130,
          render: (val: number) => (val != null ? val.toFixed(1) : '-'),
        },
        {
          title: 'H100延迟(μs)',
          dataIndex: 'h100_latency',
          key: 'h100_latency',
          width: 120,
          render: (val: number) => (val != null ? val.toFixed(1) : '-'),
        },
        {
          title: '本设备吞吐量(GOPS)',
          dataIndex: 'device_throughput',
          key: 'device_throughput',
          width: 160,
          render: (val: number) => (val != null ? val.toFixed(1) : '-'),
        },
        {
          title: 'H100吞吐量(GOPS)',
          dataIndex: 'h100_throughput',
          key: 'h100_throughput',
          width: 150,
          render: (val: number) => (val != null ? val.toFixed(1) : '-'),
        },
      );
    }

    return baseCols;
  };

  return (
    <div>
      {/* 顶部信息栏 */}
      <PageHeader
        title={detail.name}
        breadcrumbs={[
          { title: '评测系统', path: '/evaluations/list' },
          { title: '评测任务', path: '/evaluations/list' },
          { title: detail.name },
        ]}
        extra={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/evaluations/list')}
            >
              返回
            </Button>
            {(detail.status === 'pending' || detail.status === 'queued') && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={actionLoading}
                onClick={handleStart}
              >
                启动
              </Button>
            )}
            {isRunning && (
              <Button
                danger
                icon={<PauseCircleOutlined />}
                loading={actionLoading}
                onClick={handleStop}
              >
                停止
              </Button>
            )}
            {isFailed && (
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={actionLoading}
                onClick={handleRetry}
              >
                重试
              </Button>
            )}
            <Popconfirm title="确定删除此任务？" onConfirm={handleDelete}>
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={actionLoading}
                disabled={isRunning}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        }
      />

      {/* 基本信息条 */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Space size={24} wrap>
          <span>
            <Text type="secondary">状态：</Text>
            <StatusTag status={detail.status} progress={detail.progress} />
          </span>
          <span>
            <Text type="secondary">创建时间：</Text>
            {detail.created_at}
          </span>
          <span>
            <Text type="secondary">创建人：</Text>
            {detail.creator}
          </span>
        </Space>
      </Card>

      {/* 进度区域（运行中） */}
      {isRunning && (
        <Card style={{ marginBottom: 16, borderRadius: 8 }}>
          <Row gutter={24} align="middle">
            <Col flex="160px" style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={detail.progress || 0}
                size={120}
                strokeColor={{ '0%': '#1B3A6B', '100%': '#2196F3' }}
              />
            </Col>
            <Col flex="auto">
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 16 }}>
                  评测执行中
                </Text>
                {detail.estimated_remaining && (
                  <Text type="secondary" style={{ marginLeft: 12 }}>
                    预计剩余 {detail.estimated_remaining} 秒
                  </Text>
                )}
              </div>
              {/* 终端风格日志 */}
              <div
                style={{
                  background: '#1a1a2e',
                  borderRadius: 8,
                  padding: '12px 16px',
                  maxHeight: 200,
                  overflowY: 'auto',
                  fontFamily: '"Fira Code", "Courier New", monospace',
                  fontSize: 12,
                  lineHeight: 1.8,
                  color: '#00ff88',
                }}
              >
                {logs.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      color: line.includes('[WARN]')
                        ? '#ffaa00'
                        : line.includes('[ERROR]')
                          ? '#ff4444'
                          : '#00ff88',
                    }}
                  >
                    {line}
                  </div>
                ))}
                <div style={{ color: '#00ff88', animation: 'pulse 1s infinite' }}>
                  ▌
                </div>
                <div ref={logEndRef} />
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* 评测完成 - 大进度环 */}
      {isCompleted && (
        <Card style={{ marginBottom: 16, borderRadius: 8 }}>
          <Row gutter={24} align="middle">
            <Col flex="160px" style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={100}
                size={120}
                strokeColor="#52c41a"
                format={() => (
                  <span style={{ color: '#52c41a', fontWeight: 600 }}>
                    <CheckCircleFilled style={{ fontSize: 20, marginRight: 4 }} />
                    完成
                  </span>
                )}
              />
            </Col>
            <Col flex="auto">
              <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
                评测完成
              </Text>
              <div style={{ marginTop: 8, color: '#666' }}>
                任务已成功完成，可以查看评测结果和报告。
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* 配置信息卡片 */}
      <Card title="配置信息" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="评测大类">
            <Tag color="blue">{getCategoryLabel(detail.task_category)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="子场景">
            <Tag color="geekblue">
              {getSubTypeLabel(detail.task_category, detail.task_type)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="设备类型">
            <span style={{ color: device?.color, fontWeight: 500 }}>
              {device?.label || detail.device_type}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="设备数量">
            {detail.device_count} 台
          </Descriptions.Item>
          <Descriptions.Item label="工具集">
            {detail.toolset_name || '未选择'}
          </Descriptions.Item>
          {isOperatorTest && (
            <>
              <Descriptions.Item label="算子库">
                {detail.operator_lib_name
                  ? <Tag color="purple">{detail.operator_lib_name}</Tag>
                  : <span style={{ color: '#999' }}>未选择</span>
                }
              </Descriptions.Item>
              <Descriptions.Item label="算子分类">
                {detail.operator_categories && detail.operator_categories.length > 0
                  ? detail.operator_categories.map((c: string) => (
                      <Tag key={c} color="cyan" style={{ marginBottom: 4 }}>{c}</Tag>
                    ))
                  : <span style={{ color: '#999' }}>全部分类</span>
                }
              </Descriptions.Item>
              <Descriptions.Item label="测试算子数量">
                {detail.operator_count
                  ? `${detail.operator_count} 个`
                  : <span style={{ color: '#999' }}>全部匹配算子</span>
                }
              </Descriptions.Item>
            </>
          )}
          <Descriptions.Item label="优先级">
            <Tag color={priorityInfo?.color}>
              {priorityInfo?.label || detail.priority}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="任务描述" span={2}>
            {detail.description || '无'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 评测结果 - 模型测试 */}
      {isCompleted && !isOperatorTest && modelResults && (
        <Card
          title="评测结果 - 模型测试"
          style={{ marginBottom: 16, borderRadius: 8 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} md={4}>
              <Card
                size="small"
                style={{
                  textAlign: 'center',
                  borderRadius: 8,
                  background: '#f6f9ff',
                }}
              >
                <Statistic
                  title="TGS (tokens/s)"
                  value={modelResults.tgs || modelResults.tokens_per_second}
                  precision={1}
                  valueStyle={{
                    color: '#1B3A6B',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card
                size="small"
                style={{
                  textAlign: 'center',
                  borderRadius: 8,
                  background: '#f6f9ff',
                }}
              >
                <Statistic
                  title="首字延迟 (ms)"
                  value={modelResults.first_token_latency}
                  precision={1}
                  valueStyle={{
                    color: '#2196F3',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card
                size="small"
                style={{
                  textAlign: 'center',
                  borderRadius: 8,
                  background: '#f6f9ff',
                }}
              >
                <Statistic
                  title="推理精度"
                  value={modelResults.inference_accuracy || modelResults.inference_score}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color: '#52c41a',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card
                size="small"
                style={{
                  textAlign: 'center',
                  borderRadius: 8,
                  background: '#f6f9ff',
                }}
              >
                <Statistic
                  title="吞吐量"
                  value={modelResults.throughput}
                  precision={1}
                  valueStyle={{
                    color: '#fa8c16',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card
                size="small"
                style={{
                  textAlign: 'center',
                  borderRadius: 8,
                  background: '#f6f9ff',
                }}
              >
                <Statistic
                  title="显存占用 (GB)"
                  value={modelResults.memory_usage}
                  precision={1}
                  valueStyle={{
                    color: '#722ed1',
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* 评测结果 - 算子测试 */}
      {isCompleted && isOperatorTest && (
        <Card
          title={`评测结果 - 算子测试（${getSubTypeLabel(detail.task_category, detail.task_type)}）`}
          style={{ marginBottom: 16, borderRadius: 8 }}
        >
          {/* 汇总统计 */}
          {operatorSummary && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 8, background: '#f6f9ff' }}>
                  <Statistic title="测试算子数" value={operatorSummary.total} valueStyle={{ color: '#1B3A6B', fontSize: 28, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 8, background: '#f6f9ff' }}>
                  <Statistic title="通过数" value={operatorSummary.passed} valueStyle={{ color: '#52c41a', fontSize: 28, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 8, background: '#f6f9ff' }}>
                  <Statistic title="通过率" value={operatorSummary.passRate} suffix="%" precision={1} valueStyle={{ color: operatorSummary.allPass ? '#52c41a' : '#fa8c16', fontSize: 28, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 8, background: '#f6f9ff' }}>
                  <Statistic title="FP16平均损失" value={operatorSummary.avgFp16Loss} suffix="%" precision={2} valueStyle={{ color: operatorSummary.avgFp16Loss < 1 ? '#52c41a' : '#fa8c16', fontSize: 28, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 8, background: '#f6f9ff' }}>
                  <Statistic title="INT8平均损失" value={operatorSummary.avgInt8Loss} suffix="%" precision={2} valueStyle={{ color: operatorSummary.avgInt8Loss < 3 ? '#52c41a' : '#fa8c16', fontSize: 28, fontWeight: 700 }} />
                </Card>
              </Col>
            </Row>
          )}
          {operatorResults.length > 0 ? (
            <Table
              columns={getOperatorColumns()}
              dataSource={operatorResults}
              rowKey="id"
              size="small"
              scroll={{ x: isAccuracyAndPerf ? 1400 : 800 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个算子`,
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              暂无算子测试结果数据
            </div>
          )}
        </Card>
      )}

      {/* 报告区域（完成后显示） */}
      {isCompleted && (
        <Card style={{ borderRadius: 8, marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <Space>
              <CheckCircleFilled style={{ color: '#52c41a', fontSize: 20 }} />
              <Text strong style={{ fontSize: 16 }}>
                评测报告已生成
              </Text>
            </Space>
            <Space wrap>
              {detail.report_id && (
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => navigate(`/reports/${detail.report_id}`)}
                >
                  查看报告
                </Button>
              )}
              <Button icon={<SaveOutlined />} onClick={handleArchive}>
                保存到个人存档
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadReport}
              >
                下载报告
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* 失败状态时显示日志 */}
      {isFailed && (
        <Card title="运行日志" style={{ marginTop: 16, borderRadius: 8 }}>
          <div
            style={{
              background: '#1a1a2e',
              borderRadius: 8,
              padding: '12px 16px',
              maxHeight: 300,
              overflowY: 'auto',
              fontFamily: '"Fira Code", "Courier New", monospace',
              fontSize: 12,
              lineHeight: 1.8,
              color: '#ff4444',
            }}
          >
            {logs.length > 0 ? (
              logs.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color: line.includes('[WARN]')
                      ? '#ffaa00'
                      : line.includes('[ERROR]')
                        ? '#ff4444'
                        : '#00ff88',
                  }}
                >
                  {line}
                </div>
              ))
            ) : (
              <div style={{ color: '#666' }}>暂无日志</div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
