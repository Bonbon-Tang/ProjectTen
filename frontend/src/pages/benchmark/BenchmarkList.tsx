import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Input, Select, Row, Col, Tag, Spin, Statistic, Typography } from 'antd';
import { ThunderboltOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import {
  getBenchmarkOperators,
  getBenchmarkCategories,
  getBenchmarkSummary,
} from '@/api/benchmark';

const { Text } = Typography;

interface BenchmarkOperator {
  id: number;
  name: string;
  category: string;
  fp32_latency: number;
  fp16_latency: number;
  int8_latency: number;
  throughput: number;
  memory_mb: number;
  input_shape: string;
  description?: string;
  specs?: string;
  // Tested results
  tested_device_type?: string;
  tested_fp32_latency?: number;
  tested_fp16_latency?: number;
  tested_int8_latency?: number;
  tested_throughput?: number;
  tested_accuracy_fp32?: number;
  tested_accuracy_fp16?: number;
  tested_accuracy_int8?: number;
  tested_operator_lib?: string;
  tested_task_id?: number;
  tested_at?: string;
}

interface BenchmarkSummary {
  total_operators: number;
  total_categories: number;
}

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

  // 获取分类列表
  const fetchCategories = useCallback(async () => {
    try {
      const res: any = await getBenchmarkCategories();
      const list = res?.data || res;
      if (Array.isArray(list)) {
        setCategories(list);
      } else if (list?.categories && Array.isArray(list.categories)) {
        setCategories(list.categories);
      }
    } catch {
      // 静默
    }
  }, []);

  // 获取摘要
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
    } catch {
      // 静默
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // 获取算子数据
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
        setPagination((prev) => ({
          ...prev,
          total: resData?.total ?? items.length,
        }));
      }
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, selectedCategory, keyword]);

  useEffect(() => {
    fetchCategories();
    fetchSummary();
  }, [fetchCategories, fetchSummary]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      render: (text: string, record) => (
        <a
          onClick={() =>
            setExpandedRowKeys((prev) =>
              prev.includes(record.id)
                ? prev.filter((k) => k !== record.id)
                : [...prev, record.id],
            )
          }
          style={{ fontWeight: 500 }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'FP32延迟(μs)',
      dataIndex: 'fp32_latency',
      key: 'fp32_latency',
      width: 120,
      sorter: (a, b) => (a.fp32_latency ?? 0) - (b.fp32_latency ?? 0),
      render: (val: number) => (val != null ? val.toFixed(1) : '-'),
    },
    {
      title: 'FP16延迟(μs)',
      dataIndex: 'fp16_latency',
      key: 'fp16_latency',
      width: 130,
      sorter: (a, b) => (a.fp16_latency ?? 0) - (b.fp16_latency ?? 0),
      render: (val: number, record) => {
        if (val == null) return '-';
        const speedup =
          record.fp32_latency && record.fp32_latency > val
            ? (record.fp32_latency / val).toFixed(2)
            : null;
        return (
          <span>
            {val.toFixed(1)}
            {speedup && (
              <span style={{ color: '#52c41a', fontSize: 11, marginLeft: 4 }}>
                ↑{speedup}x
              </span>
            )}
          </span>
        );
      },
    },
    {
      title: 'INT8延迟(μs)',
      dataIndex: 'int8_latency',
      key: 'int8_latency',
      width: 120,
      sorter: (a, b) => (a.int8_latency ?? 0) - (b.int8_latency ?? 0),
      render: (val: number) => (val != null ? val.toFixed(1) : '-'),
    },
    {
      title: '吞吐量(GOPS)',
      dataIndex: 'throughput',
      key: 'throughput',
      width: 120,
      sorter: (a, b) => (a.throughput ?? 0) - (b.throughput ?? 0),
      render: (val: number) => (val != null ? val.toFixed(1) : '-'),
    },
    {
      title: '显存(MB)',
      dataIndex: 'memory_mb',
      key: 'memory_mb',
      width: 100,
      sorter: (a, b) => (a.memory_mb ?? 0) - (b.memory_mb ?? 0),
      render: (val: number) => (val != null ? val.toFixed(0) : '-'),
    },
    {
      title: '输入Shape',
      dataIndex: 'input_shape',
      key: 'input_shape',
      width: 160,
      ellipsis: true,
      render: (val: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {val || '-'}
        </Text>
      ),
    },
    {
      title: '测试算子库',
      dataIndex: 'tested_operator_lib',
      key: 'tested_operator_lib',
      width: 130,
      render: (val: string) =>
        val ? <Tag color="purple">{val}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: '测试状态',
      key: 'tested_status',
      width: 100,
      render: (_: any, record: BenchmarkOperator) =>
        record.tested_at ? (
          <Tag color="green">已测试</Tag>
        ) : (
          <Tag>未测试</Tag>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="算子性能 Benchmark（H100基线）"
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
              <Statistic
                title="分类数"
                value={summary.total_categories}
                valueStyle={{ color: '#2196F3' }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* 筛选区 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Select
          placeholder="按分类筛选"
          style={{ width: 200 }}
          allowClear
          value={selectedCategory}
          onChange={(val) => {
            setSelectedCategory(val);
            setPagination((prev) => ({ ...prev, current: 1 }));
          }}
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
          style={{
            padding: '4px 16px',
            background: '#1B3A6B',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
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
          scroll={{ x: 1400 }}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as number[]),
            expandedRowRender: (record) => (
              <div style={{ padding: '8px 16px', background: '#fafafa', borderRadius: 8 }}>
                <Row gutter={[24, 12]}>
                  <Col span={24}>
                    <Text strong>算子名称：</Text>
                    <Text>{record.name}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>分类：</Text>
                    <Text>{record.category}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>输入Shape：</Text>
                    <Text>{record.input_shape || '-'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>显存占用：</Text>
                    <Text>{record.memory_mb != null ? `${record.memory_mb} MB` : '-'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>FP32延迟：</Text>
                    <Text>{record.fp32_latency?.toFixed(1) ?? '-'} μs</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>FP16延迟：</Text>
                    <Text>{record.fp16_latency?.toFixed(1) ?? '-'} μs</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>INT8延迟：</Text>
                    <Text>{record.int8_latency?.toFixed(1) ?? '-'} μs</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>吞吐量：</Text>
                    <Text>{record.throughput?.toFixed(1) ?? '-'} GOPS</Text>
                  </Col>
                  {record.description && (
                    <Col span={24}>
                      <Text strong>说明：</Text>
                      <Text>{record.description}</Text>
                    </Col>
                  )}
                  {record.specs && (
                    <Col span={24}>
                      <Text strong>完整规格：</Text>
                      <Text>{record.specs}</Text>
                    </Col>
                  )}
                  {record.tested_at && (
                    <>
                      <Col span={24} style={{ marginTop: 12, borderTop: '1px solid #e8e8e8', paddingTop: 12 }}>
                        <Text strong style={{ color: '#722ed1' }}>📊 最近测试结果</Text>
                        {record.tested_operator_lib && (
                          <Tag color="purple" style={{ marginLeft: 8 }}>
                            来源: {record.tested_operator_lib}
                          </Tag>
                        )}
                        {record.tested_device_type && (
                          <Tag color="blue" style={{ marginLeft: 4 }}>
                            设备: {record.tested_device_type}
                          </Tag>
                        )}
                      </Col>
                      <Col span={8}>
                        <Text strong>测试FP32精度：</Text>
                        <Text>{record.tested_accuracy_fp32?.toFixed(4) ?? '-'}</Text>
                      </Col>
                      <Col span={8}>
                        <Text strong>测试FP16精度：</Text>
                        <Text>{record.tested_accuracy_fp16?.toFixed(4) ?? '-'}</Text>
                      </Col>
                      <Col span={8}>
                        <Text strong>测试INT8精度：</Text>
                        <Text>{record.tested_accuracy_int8?.toFixed(4) ?? '-'}</Text>
                      </Col>
                      {record.tested_fp16_latency != null && (
                        <>
                          <Col span={8}>
                            <Text strong>测试FP32延迟：</Text>
                            <Text>{record.tested_fp32_latency?.toFixed(1) ?? '-'} μs</Text>
                          </Col>
                          <Col span={8}>
                            <Text strong>测试FP16延迟：</Text>
                            <Text>{record.tested_fp16_latency?.toFixed(1) ?? '-'} μs</Text>
                          </Col>
                          <Col span={8}>
                            <Text strong>测试吞吐量：</Text>
                            <Text>{record.tested_throughput?.toFixed(1) ?? '-'} GOPS</Text>
                          </Col>
                        </>
                      )}
                      <Col span={8}>
                        <Text strong>测试时间：</Text>
                        <Text type="secondary">{record.tested_at}</Text>
                      </Col>
                    </>
                  )}
                </Row>
              </div>
            ),
            rowExpandable: () => true,
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) =>
              setPagination({ ...pagination, current: page, pageSize }),
          }}
        />
      </Card>
    </div>
  );
}
