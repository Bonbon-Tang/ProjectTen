import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Space,
} from 'antd';
import { ThunderboltOutlined, TrophyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import { getBenchmarkScenarios, getModelBenchmarkRanking, getModelBenchmarkSummary } from '@/api/modelBenchmark';
import { DEVICE_TYPES } from '@/utils/constants';

const { Text } = Typography;

interface ScenarioInfo {
  scenario: string;
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
  ranking_score: number | null;
  software_completeness_score: number | null;
  memory_usage_gb: number | null;
  tested_at: string | null;
}

interface Summary {
  total_entries: number;
  total_scenarios: number;
  total_images_tested: number;
}

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

const ALL_SCENARIOS = [
  'llm',
  'text_generation',
  'code_generation',
  'multimodal',
  'image_classification',
  'object_detection',
  'semantic_segmentation',
  'speech_recognition',
  'speech_synthesis',
  'ocr',
  'image_generation',
  'machine_translation',
  'question_answering',
  'text_summarization',
  'sentiment_analysis',
  'recommendation',
  'anomaly_detection',
  'time_series',
  'medical_imaging',
  'autonomous_driving',
  'robot_control',
  'knowledge_graph',
  'video_understanding',
  'graph_neural_network',
  'reinforcement_learning',
];

function getScenarioLabel(scenario: string): string {
  return SCENARIO_LABELS[scenario] || scenario;
}

function getDeviceLabel(chips: string) {
  return DEVICE_TYPES.find((d) => d.value === chips);
}

function createPlaceholderScenario(scenario: string): ScenarioInfo {
  return { scenario, count: 0 };
}

export default function ModelBenchmarkList() {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [summary, setSummary] = useState<Summary>({ total_entries: 0, total_scenarios: 0, total_images_tested: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [sortBy, setSortBy] = useState('ranking_score');
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);

  const fetchScenarios = useCallback(async () => {
    try {
      const res: any = await getBenchmarkScenarios();
      const list = res?.data || res || [];
      const existingMap = new Map<string, ScenarioInfo>();
      if (Array.isArray(list)) {
        list.forEach((item: ScenarioInfo) => existingMap.set(item.scenario, item));
      }
      const merged = ALL_SCENARIOS.map((scenario) => existingMap.get(scenario) || createPlaceholderScenario(scenario));
      setScenarios(merged);
      if (!selectedScenario) {
        const firstActive = merged.find((item) => item.count > 0)?.scenario || merged[0]?.scenario || '';
        if (firstActive) setSelectedScenario(firstActive);
      }
    } catch {
      const merged = ALL_SCENARIOS.map(createPlaceholderScenario);
      setScenarios(merged);
      if (!selectedScenario && merged.length > 0) setSelectedScenario(merged[0].scenario);
    }
  }, [selectedScenario]);

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
    } catch {
      // silent
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchRanking = useCallback(async () => {
    if (!selectedScenario) return;
    setRankingLoading(true);
    try {
      const res: any = await getModelBenchmarkRanking({
        scenario: selectedScenario,
        eval_method: 'standard',
        sort_by: sortBy,
        page: 1,
        page_size: 100,
      });
      const d = res?.data || res || {};
      setRanking(d.items || []);
    } catch {
      setRanking([]);
    } finally {
      setRankingLoading(false);
    }
  }, [selectedScenario, sortBy]);

  useEffect(() => {
    fetchScenarios();
    fetchSummary();
  }, [fetchScenarios, fetchSummary]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const topThree = useMemo(() => (selectedScenario ? ranking.slice(0, 3) : []), [ranking, selectedScenario]);
  const selectedScenarioInfo = useMemo(
    () => scenarios.find((item) => item.scenario === selectedScenario),
    [scenarios, selectedScenario],
  );

  const columns: ColumnsType<RankingItem> = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_: any, r: RankingItem) => (
        <span style={{ fontWeight: 700, color: r.rank <= 3 ? '#d9475e' : '#16345d' }}>
          {r.rank <= 3 ? (
            <TrophyOutlined
              style={{
                color: r.rank === 1 ? '#f0b429' : r.rank === 2 ? '#8ca6c7' : '#cd7f32',
                marginRight: 6,
              }}
            />
          ) : null}
          #{r.rank}
        </span>
      ),
    },
    {
      title: '部署镜像',
      dataIndex: 'image_name',
      key: 'image_name',
      width: 240,
      render: (text: string, r: RankingItem) => (
        <div>
          <Text strong style={{ color: '#0b1c34' }}>{text}</Text>
          <div style={{ fontSize: 12, color: '#5a7393', marginTop: 4 }}>
            {r.chip_name} + {r.framework_name}
          </div>
        </div>
      ),
    },
    {
      title: '设备',
      dataIndex: 'device_type',
      key: 'device_type',
      width: 130,
      render: (val: string) => {
        const d = getDeviceLabel(val);
        return d ? <span style={{ color: d.color, fontWeight: 600 }}>{d.label}</span> : val;
      },
    },
    {
      title: '准确率',
      dataIndex: 'accuracy',
      key: 'accuracy',
      width: 110,
      render: (val: number | null) =>
        val != null ? (
          <span style={{ fontWeight: 700, color: val >= 95 ? '#12936a' : val >= 90 ? '#ff9340' : '#d9475e' }}>
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
      render: (val: number | null, r: RankingItem) => (val != null ? `${val.toFixed(1)} ${r.throughput_unit || ''}` : '-'),
    },
    {
      title: '平均延迟',
      dataIndex: 'avg_latency_ms',
      key: 'avg_latency_ms',
      width: 120,
      render: (val: number | null) => (val != null ? `${val.toFixed(1)} ms` : '-'),
    },
    {
      title: '能效比',
      dataIndex: 'energy_efficiency',
      key: 'energy_efficiency',
      width: 120,
      render: (val: number | null, r: RankingItem) => (val != null ? `${val.toFixed(1)} ${r.energy_efficiency_unit || ''}` : '-'),
    },
    {
      title: '综合评分',
      dataIndex: 'ranking_score',
      key: 'ranking_score',
      width: 110,
      render: (val: number | null) =>
        val != null ? (
          <span style={{ fontWeight: 700, color: val >= 90 ? '#12936a' : val >= 80 ? '#ff9340' : '#d9475e' }}>
            {val.toFixed(1)}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '测试时间',
      dataIndex: 'tested_at',
      key: 'tested_at',
      width: 160,
      render: (val: string | null) => (val ? <Text style={{ fontSize: 12, color: '#5a7393' }}>{val.slice(0, 19)}</Text> : '-'),
    },
  ];

  const renderExpandedRow = (record: RankingItem) => (
    <div style={{ padding: '8px 16px', background: '#f5f9ff', borderRadius: 12 }}>
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
    key: s.scenario,
    label: `${getScenarioLabel(s.scenario)}${s.count > 0 ? ` (${s.count})` : ' · 待位'}`,
  }));

  return (
    <div>
      <PageHeader
        title="模型部署 Benchmark"
        breadcrumbs={[{ title: 'Benchmark', path: '/benchmark/operators' }, { title: '模型部署榜单' }]}
      />

      <div className="tech-hero" style={{ marginBottom: 18, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="tech-glow-text" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              模型部署排行
            </div>
          </div>
        </div>
      </div>

      <Spin spinning={summaryLoading}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={6}>
            <Card className="tech-stat-card" style={{ borderRadius: 18 }}>
              <Statistic title="总测试条目" value={summary.total_entries} prefix={<ThunderboltOutlined style={{ color: '#18a8ff' }} />} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card className="tech-stat-card" style={{ borderRadius: 18 }}>
              <Statistic title="子场景数" value={ALL_SCENARIOS.length} valueStyle={{ color: '#225fd6' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card className="tech-stat-card" style={{ borderRadius: 18 }}>
              <Statistic title="已测镜像数" value={summary.total_images_tested} valueStyle={{ color: '#12936a' }} />
            </Card>
          </Col>
        </Row>
      </Spin>

      <div className="benchmark-lane-grid">
        {scenarios.map((scenario) => {
          const isActive = scenario.scenario === selectedScenario;
          const pending = scenario.count === 0;
          return (
            <div
              key={scenario.scenario}
              className={`benchmark-lane-card ${pending ? 'pending' : 'active'}`}
              onClick={() => {
                setSelectedScenario(scenario.scenario);
                setExpandedRowKeys([]);
              }}
              style={{ cursor: 'pointer', outline: isActive ? '2px solid #225fd6' : 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, color: '#0b1c34' }}>{getScenarioLabel(scenario.scenario)}</div>
                <Tag color={pending ? 'default' : 'blue'}>{pending ? '待位' : `${scenario.count}项`}</Tag>
              </div>
              <div style={{ color: '#5d7492', fontSize: 12 }}>
                {pending ? '当前暂无评测结果' : '该方向已有评测数据，可查看排行榜'}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ margin: '10px 0 12px', fontSize: 18, fontWeight: 800, color: '#0b1c34' }}>
        当前榜单 Top 3
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 18 }}>
        {[0, 1, 2].map((index, displayIndex) => {
          const item = topThree[index];
          const pedestalHeights = [260, 220, 200];
          const rankLabels = ['第1名', '第2名', '第3名'];
          const accentColors = ['#f0b429', '#9bb4d1', '#cd7f32'];
          return (
            <Col xs={24} md={8} key={rankLabels[displayIndex]}>
              <Card
                className="tech-panel benchmark-podium-card"
                style={{
                  borderRadius: 22,
                  minHeight: 280,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  background: item
                    ? 'linear-gradient(180deg, rgba(250,252,255,0.98), rgba(233,242,255,0.94))'
                    : 'linear-gradient(180deg, rgba(248,250,255,0.92), rgba(239,244,252,0.92))',
                }}
                bodyStyle={{ width: '100%', padding: 18 }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: accentColors[displayIndex], fontWeight: 800, marginBottom: 10, fontSize: 15 }}>
                    {rankLabels[displayIndex]}
                  </div>
                  <div
                    style={{
                      height: pedestalHeights[displayIndex],
                      borderRadius: '18px 18px 8px 8px',
                      background: item
                        ? `linear-gradient(180deg, ${accentColors[displayIndex]}22, ${accentColors[displayIndex]}55)`
                        : 'linear-gradient(180deg, rgba(130,150,180,0.12), rgba(130,150,180,0.28))',
                      border: `1px solid ${item ? `${accentColors[displayIndex]}66` : 'rgba(80,110,150,0.18)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 18,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {item ? (
                      <div>
                        {displayIndex === 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <Tag color="gold">冠军</Tag>
                          </div>
                        )}
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#061322', marginBottom: 8 }}>
                          {item.model_name || item.image_name}
                        </div>
                        <div style={{ color: '#425a78', marginBottom: 10 }}>{item.chip_name} + {item.framework_name}</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Tag color="blue">综合分 {item.ranking_score?.toFixed(1) ?? '-'}</Tag>
                          <Tag color="green">性能分 {item.performance_score?.toFixed(1) ?? '-'}</Tag>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#425a78', marginBottom: 8 }}>暂无结果</div>
                        <div style={{ color: '#6a7f9d' }}>暂无数据</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card className="tech-panel" style={{ borderRadius: 18, marginBottom: 16 }}>
        <Tabs
          activeKey={selectedScenario}
          onChange={(key) => {
            setSelectedScenario(key);
            setExpandedRowKeys([]);
          }}
          items={scenarioTabs}
          tabBarExtraContent={
            <Space>
              <Text style={{ color: '#425a78' }}>排序依据：</Text>
              <Select
                value={sortBy}
                onChange={(val) => {
                  setSortBy(val);
                  setExpandedRowKeys([]);
                }}
                style={{ width: 140 }}
                options={[
                  { label: '综合排行 ↓', value: 'ranking_score' },
                  { label: '准确率 ↓', value: 'accuracy' },
                  { label: '吞吐量 ↓', value: 'throughput' },
                  { label: '性能评分 ↓', value: 'performance_score' },
                  { label: '延迟 ↑', value: 'avg_latency_ms' },
                ]}
              />
            </Space>
          }
        />
        {selectedScenarioInfo?.count === 0 && (
          <div style={{ marginTop: 8, color: '#425a78' }}>
            当前子场景 <strong>{getScenarioLabel(selectedScenario)}</strong> 暂无评测结果。
          </div>
        )}
      </Card>

      <Card className="tech-panel" style={{ borderRadius: 18 }}>
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
          <div style={{ textAlign: 'center', padding: 60, color: '#425a78' }}>
            暂无该子场景的测试数据，后续产生评测结果后将自动进入榜单。
          </div>
        )}
      </Card>
    </div>
  );
}
