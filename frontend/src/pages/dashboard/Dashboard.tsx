import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Button, Space, Tag, Badge, message, Spin, Progress } from 'antd';
import {
  BarChartOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  UploadOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { EVAL_CATEGORIES } from '@/utils/constants';
import { getEvalStats, getEvaluations } from '@/api/evaluations';
import { getResourceSummary } from '@/api/resources';
import dayjs from 'dayjs';

interface RecentTask {
  id: string;
  name: string;
  task_category?: string;
  task_type?: string;
  task?: string;
  scenario?: string;
  status: string;
  created_at: string;
  creator?: string;
  creator_id?: number;
  progress?: number;
}

interface DeviceResource {
  device_type: string;
  device_label: string;
  manufacturer: string;
  total_count: number;
  available_count: number;
  online: boolean;
  color: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [deviceLoading] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    completed: 0,
    failed: 0,
  });

  const [deviceResources, setDeviceResources] = useState<DeviceResource[]>([]);
  const totalDevices = 109;
  const onlineDevices = 109;

  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res: any = await getEvalStats();
      const data = res?.data || res;
      if (data) {
        setStats({
          total: data.total ?? data.total_evaluations ?? 0,
          running: data.running ?? data.running_evaluations ?? 0,
          completed: data.completed ?? data.completed_evaluations ?? 0,
          failed: data.failed ?? data.failed_evaluations ?? 0,
        });
      }
    } catch {
      // 使用默认值
    } finally {
      setStatsLoading(false);
    }
  }, []);


  // 获取最近任务
  const fetchRecentTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getEvaluations({ page: 1, page_size: 5 });
      const data = res?.data || res;
      const items = data?.items || data?.list || [];
      if (Array.isArray(items)) {
        setRecentTasks(items.map((item: any) => ({
          ...item,
          task_category: item.task_category || item.task || '-',
          task_type: item.task_type || item.scenario || '-',
          creator: item.creator || (item.creator_id != null ? `用户${item.creator_id}` : '-'),
        })));
      }
    } catch {
      // 使用默认值
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentTasks();
  }, [fetchStats, fetchRecentTasks]);

  // 自动刷新 running 任务进度
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRunning = recentTasks.some((t) => t.status === 'running');

  useEffect(() => {
    if (hasRunning) {
      pollRef.current = setInterval(() => {
        fetchRecentTasks();
        fetchStats();
      }, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [hasRunning, fetchRecentTasks, fetchStats]);

  // 设备状态渲染
  const renderDeviceStatus = (device: DeviceResource) => {
    if (!device.online) {
      return <Badge status="default" text={<span style={{ color: '#999' }}>离线</span>} />;
    }
    const occupied = device.total_count - device.available_count;
    if (occupied === 0) {
      return <Badge status="success" text={<span style={{ color: '#52c41a' }}>空闲</span>} />;
    }
    return (
      <Badge
        status="warning"
        text={<span style={{ color: '#fa8c16' }}>使用中 ({occupied}台占用)</span>}
      />
    );
  };

  const columns: ColumnsType<RecentTask> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(`/evaluations/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '评测大类',
      dataIndex: 'task_category',
      key: 'task_category',
      width: 110,
      render: (val: string, record) => {
        const rawValue = val || record.task || '-';
        const cat = EVAL_CATEGORIES.find((c) => c.value === rawValue);
        return cat ? <Tag>{cat.icon} {cat.label}</Tag> : <Tag>{rawValue}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string, record) => <StatusTag status={status} progress={record.progress} />,
    },
    {
      title: '创建人',
      dataIndex: 'creator',
      key: 'creator',
      width: 80,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text: string) => text ? dayjs(text).format('MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/evaluations/${record.id}`)}>
          查看
        </Button>
      ),
    },
  ];

  const statCards = [
    { title: '任务总数', value: stats.total, icon: <BarChartOutlined />, color: '#1B3A6B' },
    { title: '运行中', value: stats.running, icon: <PlayCircleOutlined />, color: '#2196F3' },
    { title: '已完成', value: stats.completed, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: '失败', value: stats.failed, icon: <CloseCircleOutlined />, color: '#ff4d4f' },
  ];

  const quickActions = [
    { title: '创建评测', icon: <PlusOutlined />, path: '/evaluations/create', color: '#1B3A6B' },
    { title: '查看报告', icon: <FileTextOutlined />, path: '/reports/list', color: '#2196F3' },
    { title: '上传资产', icon: <UploadOutlined />, path: '/assets/upload', color: '#52c41a' },
    { title: '快速测试', icon: <ThunderboltOutlined />, path: '/evaluations/create', color: '#fa8c16' },
  ];

  return (
    <div>
      <PageHeader title="控制台" breadcrumbs={[{ title: '控制台' }]} />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card className="tech-hero" style={{ height: '100%', borderRadius: 18, padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'stretch', height: '100%' }}>
              <div style={{ flex: '0 0 54%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div className="tech-glow-text" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                    资源与任务总览
                  </div>
                  <div style={{ color: '#3b6fb8', fontSize: 15, lineHeight: 1.8, fontWeight: 600 }}>
                    汇总当前智算资源与评测任务状态，快速查看整体运行情况。
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ color: '#2e79da', fontSize: 14, fontWeight: 700 }}>设备在线率</div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: '#13345f' }}>100%</div>
                  <div style={{ color: '#2e79da', fontSize: 14, fontWeight: 700 }}>109/109 台在线</div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Spin spinning={statsLoading}>
            <Row gutter={[16, 16]}>
              {statCards.map((stat, index) => (
                <Col xs={12} key={index}>
                  <Card hoverable className="tech-stat-card" style={{ borderRadius: 18, height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Statistic title={stat.title} value={stat.value} />
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: `${stat.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                          color: stat.color,
                        }}
                      >
                        {stat.icon}
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Spin>
        </Col>
      </Row>

      {/* 设备资源概览 */}
      <Spin spinning={deviceLoading}>
        <Card
          title="智算设备资源概览"
          style={{ marginBottom: 24, borderRadius: 8 }}
          extra={
            totalDevices > 0 ? (
              <span style={{ color: '#999', fontSize: 12 }}>
                总计 {totalDevices} 台 | {onlineDevices} 台在线
              </span>
            ) : null
          }
        >
          <Row gutter={[16, 16]}>
            {deviceResources.map((device) => {
              const percent =
                device.total_count > 0
                  ? Math.round((device.available_count / device.total_count) * 100)
                  : 0;
              const progressColor = !device.online
                ? '#d9d9d9'
                : device.available_count === device.total_count
                  ? '#52c41a'
                  : '#fa8c16';

              return (
                <Col xs={24} sm={12} md={8} lg={Math.floor(24 / Math.max(deviceResources.length, 1))} key={device.device_type}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 10,
                      borderLeft: `4px solid ${device.color || '#1B3A6B'}`,
                    }}
                    styles={{ body: { padding: '16px' } }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>
                        {device.device_label}
                      </span>
                      {renderDeviceStatus(device)}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Progress
                        percent={percent}
                        strokeColor={progressColor}
                        size="small"
                        format={() =>
                          `空闲 ${device.available_count} / 总共 ${device.total_count}`
                        }
                      />
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      厂商: {device.manufacturer}
                    </div>
                  </Card>
                </Col>
              );
            })}
            {deviceResources.length === 0 && !deviceLoading && (
              <Col span={24}>
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无设备数据</div>
              </Col>
            )}
          </Row>
        </Card>
      </Spin>

      <Row gutter={[16, 16]}>
        {/* 最近任务 */}
        <Col xs={24} lg={16}>
          <Card
            title="最近评测任务"
            extra={
              <Button type="link" onClick={() => navigate('/evaluations/list')}>
                查看全部 <ArrowRightOutlined />
              </Button>
            }
            style={{ borderRadius: 8 }}
          >
            <Table
              columns={columns}
              dataSource={recentTasks}
              rowKey="id"
              pagination={false}
              size="small"
              loading={loading}
            />
          </Card>
        </Col>

        {/* 快捷操作 */}
        <Col xs={24} lg={8}>
          <Card title="快捷操作" style={{ borderRadius: 8 }}>
            <Row gutter={[12, 12]}>
              {quickActions.map((action, index) => (
                <Col span={12} key={index}>
                  <Card
                    hoverable
                    style={{
                      textAlign: 'center',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                    styles={{ body: { padding: '20px 12px' } }}
                    onClick={() => navigate(action.path)}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: `${action.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px',
                        fontSize: 20,
                        color: action.color,
                      }}
                    >
                      {action.icon}
                    </div>
                    <div style={{ fontSize: 13, color: '#333' }}>{action.title}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
