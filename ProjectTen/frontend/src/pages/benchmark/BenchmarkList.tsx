import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Card,
  Table,
  Input,
  Select,
  Row,
  Col,
  Tag,
  Spin,
  Statistic,
  Typography,
  Collapse,
  Empty,
} from 'antd';
import { ThunderboltOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import {
  getBenchmarkOperators,
  getBenchmarkCategories,
  getBenchmarkSummary,
  getOperatorBenchmarks,
} from '@/api/benchmark';
import { DEVICE_TYPES } from '@/utils/constants';

const { Text } = Typography;

interface BenchmarkOperator {
  id: number;
  name: string;
  category: string;
  h100_fp32_latency: number;
  h100_fp16_latency: number;
  h100_int8_latency: number;
  h100_throughput: number;
  h100_memory_mb: number;
  input_shape: string;
  description?: string;
  tested_device_type?: string;
  tested_operator_lib?: string;
  tested_at?: string;
}

interface BenchmarkSummary {
  total_operators: number;
  total_categories: number;
}

interface ShapeResult {
  id: number;
  input_shape: string;
  fp32_accuracy: number | null;
  fp16_accuracy: number | null;
  int8_accuracy: number | null;
  fp16_loss_rate: number | null;
  int8_loss_rate: number | null;
  accuracy_pass: number;
  fp32_latency: number | null;
  fp16_latency: number | null;
  int8_latency: number | null;
  throughput: number | null;
  operator_lib: string | null;
  task_id: number | null;
  tested_at: string | null;
}

interface DeviceBenchmarkGroup {
  device_type: string;
  results: ShapeResult[];
}

function getDeviceLabel(deviceType: string) {
  return DEVICE_TYPES.find((d) => d.value === deviceType);
}

// Shape results table columns
const shapeColumns: ColumnsType<ShapeResult> = [
  {
    title: '输入Shape',
    dataIndex: 'input_shape',
    key: 'input_shape',
    width: 160,
    render: (val: string) => <Text code style={{ fontSize: 12 }}>{val}</Text>,
  },
  {
    title: 'FP32精度',
    dataIndex: 'fp32_accuracy',
    key: 'fp32_accuracy',
    width: 100,
    render: (val: number | null) => val != null ? val.toFixed(4) : '-',
  },
  {
    title: 'FP16精度',
    dataIndex: 'fp16_accuracy',
    key: 'fp16_accuracy',
    width: 100,
    render: (val: number | null) => val != null ? val.toFixed(4) : '-',
  },
  {
    title: 'INT8精度',
    dataIndex: 'int8_accuracy',
    key: 'int8_accuracy',
    width: 100,
    render: (val: number | null) => val != null ? val.toFixed(4) : '-',
  },
  {
    title: '损失率',
    dataIndex: 'int8_loss_rate',
    key: 'int8_loss_rate',
    width: 90,
    render: (val: number | null) => {
      if (val == null) return '-';
      let color = '#fa8c16';
      if (val < 1) color = '#52c41a';
      if (val > 5) color = '#ff4d4f';
      return <span style={{ color, fontWeight: 600 }}>{val.toFixed(2)}%</span>;
    },
  },
  {
    title: '通过',
    dataIndex: 'accuracy_pass',
    key: 'accuracy_pass',
    width: 60,
    render: (val: number) => val ? <Tag color="green">✓</Tag> : <Tag color="red">✗</Tag>,
  },
  {
    title: 'FP16延迟(μs)',
    dataIndex: 'fp16_latency',
    key: 'fp16_latency',
    width: 110,
    render: (val: number | null) => val != null ? val.toFixed(1) : '-',
  },
  {
    title: '吞吐量(GOPS)',
    dataIndex: 'throughput',
    key: 'throughput',
    width: 120,
    render: (val: number | null) => val != null ? val.toFixed(1) : '-',
  },
  {
    title: '算子库',
    dataIndex: 'operator_lib',
    key: 'operator_lib',
    width: 120,
    render: (val: string | null) => val ? <Tag color="purple">{val}</Tag> : '-',
  },
  {
    title: '测试时间',
    dataIndex: 'tested_at',
    key: 'tested_at',
    width: 160,
    render: (val: string | null) => val ? <Text type="secondary" style={{ fontSize: 12 }}>{val.slice(0, 19)}</Text> : '-',
  },
];

export default function BenchmarkList() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BenchmarkOperator[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [summary, setSummary] = useState<BenchmarkSummary>({ total_operators: 0, total_categories: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
  // Cache for per-operator benchmark data
  const [benchmarkCache, setBenchmarkCache] = useState<Record<number, DeviceBenchmarkGroup[]>>({});
  const [benchmarkLoading, setBenchmarkLoading] = useState<Record<number, boolean>>({});

  const fetchCategories = useCallback(async () => {
    try {
      const res: any = await getBenchmarkCategories();
      const list = res?.data || res;
      if (Array.isArray(list)) {
        setCategories(list.map((c: any) => (typeof c === 'string' ? c : c.category)));
      } else if (list?.categories && Array.isArray(list.categories)) {
        setCategories(list.categories.map((c: any) => (typeof c === 'string' ? c : c.category)));
      }
    } catch { /* silent */ }
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res: any = await getBenchmarkSummary();
      const d = res?.data || res;
      if (d) {
        setSummary({
          total_operators: d.total_operators ?? d.total ?? 0,
          total_categories: d.total_categories ?? d.categories_count ?? 0,
        });
      }
    } catch { /* silent */ }
    finally { setSummaryLoading(false); }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getBenchmarkOperators({
        page: pagination.current,
        page_size: pagination.pageSize,
        category: selectedCategory,
        keyword: keyword || undefined,
      });
      const resData = res?.data || res;
      const items = resData?.items || resData?.list || [];
      if (Array.isArray(items)) {
        setData(items);
        setPagination((prev) => ({ ...prev, total: resData?.total ?? items.length }));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [pagination.current, pagination.pageSize, selectedCategory, keyword]);

  useEffect(() => { fetchCategories(); fetchSummary(); }, [fetchCategories, fetchSummary]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch per-operator benchmarks when expanding
  const fetchOperatorBenchmarks = async (operatorId: number) => {
    if (benchmarkCache[operatorId]) return; // already cached
    setBenchmarkLoading((prev) => ({ ...prev, [operatorId]: true }));
    try {
      const res: any = await getOperatorBenchmarks(operatorId);
      const groups: DeviceBenchmarkGroup[] = res?.data || res || [];
      setBenchmarkCache((prev) => ({ ...prev, [operatorId]: groups }));
    } catch { /* silent */ }
    finally { setBenchmarkLoading((prev) => ({ ...prev, [operatorId]: false })); }
  };

  const handleExpand = (expanded: boolean, record: BenchmarkOperator) => {
    if (expanded) {
      setExpandedRowKeys((prev) => [...prev, record.id]);
      fetchOperatorBenchmarks(record.id);
    } else {
      setExpandedRowKeys((prev) => prev.filter((k) => k !== record.id));
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const columns: ColumnsType<BenchmarkOperator> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_, __, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: '算子名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'H100 FP32(μs)',
      dataIndex: 'h100_fp32_latency',
      key: 'h100_fp32_latency',
      width: 120,
      sorter: (a, b) => (a.h100_fp32_latency ?? 0) - (b.h100_fp32_latency ?? 0),
      render: (val: number) => val != null ? val.toFixed(1) : '-',
    },
    {
      title: 'H100 FP16(μs)',
      dataIndex: 'h100_fp16_latency',
      key: 'h100_fp16_latency',
      width: 120,
      sorter: (a, b) => (a.h100_fp16_latency ?? 0) - (b.h100_fp16_latency ?? 0),
      render: (val: number) => val != null ? val.toFixed(1) : '-',
    },
    {
      title: 'H100 INT8(μs)',
      dataIndex: 'h100_int8_latency',
      key: 'h100_int8_latency',
      width: 120,
      sorter: (a, b) => (a.h100_int8_latency ?? 0) - (b.h100_int8_latency ?? 0),
      render: (val: number) => val != null ? val.toFixed(1) : '-',
    },
    {
      title: '吞吐量(GOPS)',
      dataIndex: 'h100_throughput',
      key: 'h100_throughput',
      width: 120,
      sorter: (a, b) => (a.h100_throughput ?? 0) - (b.h100_throughput ?? 0),
      render: (val: number) => val != null ? val.toFixed(1) : '-',
    },
    {
      title: '输入Shape',
      dataIndex: 'input_shape',
      key: 'input_shape',
      width: 160,
      ellipsis: true,
      render: (val: string) => <Text type="secondary" style={{ fontSize: 12 }}>{val || '-'}</Text>,
    },
    {
      title: '测试状态',
      key: 'tested_status',
      width: 100,
      render: (_: any, record: BenchmarkOperator) =>
        record.tested_at ? <Tag color="green">已测试</Tag> : <Tag>未测试</Tag>,
    },
  ];

  // Render expanded row: first level = chips, second level = shapes (table)
  const renderExpandedRow = (record: BenchmarkOperator) => {
    const groups = benchmarkCache[record.id];
    const isLoading = benchmarkLoading[record.id];

    if (isLoading) {
      return <div style={{ padding: 24, textAlign: 'center' }}><Spin tip="加载测试数据..." /></div>;
    }

    if (!groups || groups.length === 0) {
      return (
        <div style={{ padding: '16px 24px', background: '#fafafa', borderRadius: 8 }}>
          <Row gutter={[24, 12]}>
            <Col span={8}><Text strong>算子：</Text>{record.name}</Col>
            <Col span={8}><Text strong>分类：</Text>{record.category}</Col>
            <Col span={8}><Text strong>默认Shape：</Text>{record.input_shape || '-'}</Col>
            {record.description && <Col span={24}><Text strong>说明：</Text>{record.description}</Col>}
          </Row>
          <div style={{ marginTop: 16, color: '#999', textAlign: 'center' }}>
            暂无芯片测试数据，运行算子测试任务后将自动填充
          </div>
        </div>
      );
    }

    // Build Collapse panels: one per device type
    const collapseItems = groups.map((group) => {
      const deviceInfo = getDeviceLabel(group.device_type);
      const deviceLabel = deviceInfo?.label || group.device_type;
      const deviceColor = deviceInfo?.color || '#333';
      const passCount = group.results.filter((r) => r.accuracy_pass).length;
      const totalCount = group.results.length;

      return {
        key: group.device_type,
        label: (
          <span>
            <span style={{ color: deviceColor, fontWeight: 600, marginRight: 8 }}>
              {deviceLabel}
            </span>
            <Tag>{totalCount} 个Shape</Tag>
            <Tag color={passCount === totalCount ? 'green' : 'orange'}>
              通过 {passCount}/{totalCount}
            </Tag>
            {group.results[0]?.operator_lib && (
              <Tag color="purple">算子库: {group.results[0].operator_lib}</Tag>
            )}
          </span>
        ),
        children: (
          <Table
            columns={shapeColumns}
            dataSource={group.results}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            pagination={group.results.length > 10 ? { pageSize: 10, size: 'small' } : false}
          />
        ),
      };
    });

    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ marginBottom: 12, padding: '0 16px' }}>
          <Row gutter={[24, 8]}>
            <Col><Text strong>算子：</Text>{record.name}</Col>
            <Col><Text strong>分类：</Text><Tag>{record.category}</Tag></Col>
            <Col><Text strong>默认Shape：</Text><Text code>{record.input_shape}</Text></Col>
            {record.description && <Col span={24}><Text strong>说明：</Text>{record.description}</Col>}
          </Row>
        </div>
        <Collapse
          defaultActiveKey={groups.length === 1 ? [groups[0].device_type] : []}
          items={collapseItems}
          style={{ background: '#fff' }}
        />
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="算子性能 Benchmark"
        breadcrumbs={[{ title: 'Benchmark', path: '/benchmark/operators' }, { title: '算子Benchmark' }]}
      />

      {/* 统计摘要 */}
      <Spin spinning={summaryLoading}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={6}>
            <Card style={{ borderRadius: 8 }}>
              <Statistic
                title="总算子数"
                value={summary.total_operators}
                prefix={<ThunderboltOutlined style={{ color: '#1B3A6B' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card style={{ borderRadius: 8 }}>
              <Statistic title="分类数" value={summary.total_categories} valueStyle={{ color: '#2196F3' }} />
            </Card>
          </Col>
        </Row>
      </Spin>

      <Alert
        showIcon
        type="warning"
        style={{ marginBottom: 16, borderRadius: 8 }}
        message="当前 H100 基线为参考公开资料与网上 benchmark 信息整理的对比基线，用于演示与评测参考，不代表当前系统实时实测结果。"
      />

      {/* 筛选区 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Select
          placeholder="按分类筛选"
          style={{ width: 200 }}
          allowClear
          value={selectedCategory}
          onChange={(val) => { setSelectedCategory(val); setPagination((prev) => ({ ...prev, current: 1 })); }}
          options={categories.map((c) => ({ label: c, value: c }))}
        />
        <Input
          placeholder="搜索算子名称"
          prefix={<SearchOutlined />}
          style={{ width: 240 }}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
        />
        <button
          onClick={handleSearch}
          style={{ padding: '4px 16px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          搜索
        </button>
      </div>

      {/* 主体表格 */}
      <Card style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          expandable={{
            expandedRowKeys,
            onExpand: handleExpand,
            expandedRowRender: renderExpandedRow,
            rowExpandable: () => true,
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
          }}
        />
      </Card>
    </div>
  );
}
