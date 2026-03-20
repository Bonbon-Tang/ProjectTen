import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tabs,
  Tag,
  Spin,
  Statistic,
  Typography,
  Row,
  Col,
  Select,
  Descriptions,
  Collapse,
  Button,
  Space,
} from 'antd';
import { ThunderboltOutlined, TrophyOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import { getBenchmarkScenarios, getModelBenchmarkRanking, getModelBenchmarkSummary, getAvailableImages } from '@/api/modelBenchmark';
import { DEVICE_TYPES } from '@/utils/constants';

const { Text } = Typography;

interface ScenarioInfo {
  task_type: string;
  count: number;
}

interface RankingItem {
  id: number;
  rank: number;
  image_id: number;
  image_name: string;
  chip_name: string;
  framework_name: string;
  model_name: string;
  device_type: string;
  eval_method: string;
  throughput: number | null;
  throughput_unit: string | null;
  avg_latency_ms: number | null;
  p50_latency_ms: number | null;
  p99_latency_ms: number | null;
  accuracy: number | null;
  accuracy_metric: string | null;
  energy_efficiency: number | null;
  energy_efficiency_unit: string | null;
  performance_score: number | null;
  software_completeness_score: number | null;
  memory_usage_gb: number | null;
  tested_at: string | null;
}

interface Summary {
  total_entries: number;
  total_scenarios: number;
  total_images_tested: number;
}

// Sub-scenario labels
const SCENARIO_LABELS: Record<string, string> = {
  llm: '大语言模型',
  text_generation: '文本生成',
  code_generation: '代码生成',
  multimodal: '多模态',
  image_classification: '图像分类',
  object_detection: '目标检测',
  semantic_segmentation: '语义分割',
  speech_recognition: '语音识别',
  speech_synthesis: '语音合成',
  ocr: '文字识别',
  image_generation: '图像生成',
  machine_translation: '机器翻译',
  question_answering: '问答系统',
};

function getScenarioLabel(taskType: string): string {
  return SCENARIO_LABELS[taskType] || taskType;
}

function getDeviceLabel(deviceType: string) {
  return DEVICE_TYPES.find((d) => d.value === deviceType);
}

export default function ModelBenchmarkList() {
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [summary, setSummary] = useState<Summary>({ total_entries: 0, total_scenarios: 0, total_images_tested: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [sortBy, setSortBy] = useState('accuracy');
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);

  // Fetch scenarios
  const fetchScenarios = useCallback(async () => {
    try {
      const res: any = await getBenchmarkScenarios();
      const list = res?.data || res || [];
      if (Array.isArray(list) && list.length > 0) {
        setScenarios(list);
        if (!selectedScenario) {
          setSelectedScenario(list[0].task_type);
        }
      }
    } catch { /* silent */ }
  }, [selectedScenario]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res: any = await getModelBenchmarkSummary();
      const d = res?.data || res || {};
      setSummary({
        total_entries: d.total_entries ?? 0,
        total_scenarios: d.total_scenarios ?? 0,
        total_images_tested: d.total_images_tested ?? 0,
      });
    } catch { /* silent */ }
    finally { setSummaryLoading(false); }
  }, []);

  // Fetch ranking for selected scenario
  const fetchRanking = useCallback(async () => {
    if (!selectedScenario) return;
    setRankingLoading(true);
    try {
      const res: any = await getModelBenchmarkRanking({
        task_type: selectedScenario,
        eval_method: 'standard',
        sort_by: sortBy,
        page: 1,
        page_size: 100,
      });
      const d = res?.data || res || {};
      setRanking(d.items || []);
    } catch { /* silent */ }
    finally { setRankingLoading(false); }
  }, [selectedScenario, sortBy]);

  useEffect(() => { fetchScenarios(); fetchSummary(); }, [fetchScenarios, fetchSummary]);
  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  // Columns for ranking table (sorted by accuracy)
  const columns: ColumnsType<RankingItem> = [
    {
      title: '排名',
      key: 'rank',
      width: 70,
      render: (_: any, r: RankingItem) => (
        <span style={{ fontWeight: 700, color: r.rank <= 3 ? '#e6002d' : '#333' }}>
          {r.rank <= 3 ? <TrophyOutlined style={{ color: r.rank === 1 ? '#ffd700' : r.rank === 2 ? '#c0c0c0' : '#cd7f32', marginRight: 4 }} /> : ''}
          #{r.rank}
        </span>
      ),
    },
    {
      title: '镜像名称',
      dataIndex: 'image_name',
      key: 'image_name',
      width: 220,
      render: (text: string, r: RankingItem) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            {r.chip_name} + {r.framework_name}
          </div>
        </div>
      ),
    },
    {
      title: '设备',
      dataIndex: 'device_type',
      key: 'device_type',
      width: 120,
      render: (val: string) => {
        const d = getDeviceLabel(val);
        return d ? <span style={{ color: d.color, fontWeight: 500 }}>{d.label}</span> : val;
      },
    },
    {
      title: '准确率',
      dataIndex: 'accuracy',
      key: 'accuracy',
      width: 110,
      sorter: (a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0),
      render: (val: number | null, r: RankingItem) =>
        val != null ? (
          <span style={{ fontWeight: 600, color: val >= 95 ? '#52c41a' : val >= 90 ? '#fa8c16' : '#ff4d4f' }}>
            {val.toFixed(2)}%
          </span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '吞吐量',
      dataIndex: 'throughput',
      key: 'throughput',
      width: 120,
      render: (val: number | null, r: RankingItem) =>
        val != null ? `${val.toFixed(1)} ${r.throughput_unit || ''}` : '-',
    },
    {
      title: '平均延迟',
      dataIndex: 'avg_latency_ms',
      key: 'avg_latency_ms',
      width: 110,
      render: (val: number | null) => val != null ? `${val.toFixed(1)} ms` : '-',
    },
    {
      title: '能效比',
      dataIndex: 'energy_efficiency',
      key: 'energy_efficiency',
      width: 120,
      render: (val: number | null, r: RankingItem) =>
        val != null ? `${val.toFixed(1)} ${r.energy_efficiency_unit || ''}` : '-',
    },
    {
      title: '性能评分',
      dataIndex: 'performance_score',
      key: 'performance_score',
      width: 100,
      render: (val: number | null) =>
        val != null ? (
          <span style={{ fontWeight: 600, color: val >= 90 ? '#52c41a' : val >= 80 ? '#fa8c16' : '#ff4d4f' }}>
            {val.toFixed(1)}
          </span>
        ) : '-',
    },
    {
      title: '测试时间',
      dataIndex: 'tested_at',
      key: 'tested_at',
      width: 160,
      render: (val: string | null) => val ? <Text type="secondary" style={{ fontSize: 12 }}>{val.slice(0, 19)}</Text> : '-',
    },
  ];

  // Expanded row: detailed performance metrics
  const renderExpandedRow = (record: RankingItem) => (
    <div style={{ padding: '8px 16px', background: '#fafafa', borderRadius: 8 }}>
      <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
        <Descriptions.Item label="P50延迟">{record.p50_latency_ms?.toFixed(1) ?? '-'} ms</Descriptions.Item>
        <Descriptions.Item label="P99延迟">{record.p99_latency_ms?.toFixed(1) ?? '-'} ms</Descriptions.Item>
        <Descriptions.Item label="显存占用">{record.memory_usage_gb?.toFixed(1) ?? '-'} GB</Descriptions.Item>
        <Descriptions.Item label="准确率指标">{record.accuracy_metric || '-'}</Descriptions.Item>
        <Descriptions.Item label="评测方法">{record.eval_method}</Descriptions.Item>
        <Descriptions.Item label="测试时间">{record.tested_at?.slice(0, 19) ?? '-'}</Descriptions.Item>
      </Descriptions>
    </div>
  );

  const scenarioTabs = scenarios.map((s) => ({
    key: s.task_type,
    label: `${getScenarioLabel(s.task_type)} (${s.count})`,
  }));

  return (
    <div>
      <PageHeader
        title="模型部署 Benchmark"
        breadcrumbs={[{ title: 'Benchmark', path: '/benchmark/operators' }, { title: '模型部署榜单' }]}
      />

      {/* 统计摘要 */}
      <Spin spinning={summaryLoading}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={6}>
            <Card style={{ borderRadius: 8 }}>
              <Statistic title="总测试条目" value={summary.total_entries} prefix={<ThunderboltOutlined style={{ color: '#1B3A6B' }} />} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card style={{ borderRadius: 8 }}>
              <Statistic title="子场景数" value={summary.total_scenarios} valueStyle={{ color: '#2196F3' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card style={{ borderRadius: 8 }}>
              <Statistic title="已测镜像数" value={summary.total_images_tested} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* 子场景 Tabs */}
      <Card style={{ borderRadius: 8, marginBottom: 16 }}>
        <Tabs
          activeKey={selectedScenario}
          onChange={(key) => { setSelectedScenario(key); setExpandedRowKeys([]); }}
          items={scenarioTabs}
          tabBarExtraContent={
            <Space>
              <Text type="secondary">排序依据：</Text>
              <Select
                value={sortBy}
                onChange={(val) => { setSortBy(val); setExpandedRowKeys([]); }}
                style={{ width: 140 }}
                options={[
                  { label: '准确率 ↓', value: 'accuracy' },
                  { label: '吞吐量 ↓', value: 'throughput' },
                  { label: '性能评分 ↓', value: 'performance_score' },
                  { label: '延迟 ↑', value: 'avg_latency_ms' },
                ]}
              />
            </Space>
          }
        />
      </Card>

      {/* 榜单表格 */}
      <Card style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={ranking}
          rowKey="id"
          loading={rankingLoading}
          scroll={{ x: 1200 }}
          expandable={{
            expandedRowKeys,
            onExpand: (expanded, record) => {
              setExpandedRowKeys(expanded ? [record.id] : []);
            },
            expandedRowRender: renderExpandedRow,
            rowExpandable: () => true,
          }}
          pagination={false}
        />
        {!rankingLoading && ranking.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            暂无该子场景的测试数据，创建模型部署评测任务后将自动填充榜单
          </div>
        )}
      </Card>
    </div>
  );
}
