import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Input,
  Tabs,
  Tag,
  Popconfirm,
  message,
  Card,
  Descriptions,
  Modal,
  Row,
  Col,
  Statistic,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  ToolOutlined,
  ExperimentOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import { ASSET_TYPES } from '@/utils/constants';
import { getAssets, deleteAsset } from '@/api/assets';

interface AssetItem {
  id: number;
  name: string;
  asset_type: string;
  category: string | null;
  version: string;
  file_size: number;
  download_count: number;
  reuse_count: number;
  tags: string[];
  description: string | null;
  status: string;
  is_shared: boolean;
  share_scope: string;
  creator_id: number | null;
  created_at: string;
  updated_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function AssetList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<AssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (activeTab !== 'all') params.type = activeTab;
      if (keyword) params.keyword = keyword;
      const res: any = await getAssets(params);
      const d = res?.data || res;
      setData(d?.items || []);
      setTotal(d?.total || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeTab, keyword]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleDelete = async (id: number) => {
    try {
      await deleteAsset(String(id));
      message.success('删除成功');
      fetchAssets();
    } catch {
      message.error('删除失败');
    }
  };

  const showDetail = (record: AssetItem) => {
    setSelectedAsset(record);
    setDetailVisible(true);
  };

  const typeColorMap: Record<string, string> = {
    model: 'blue',
    dataset: 'green',
    operator: 'purple',
    script: 'orange',
    template: 'cyan',
    toolset: 'geekblue',
  };

  const typeIconMap: Record<string, React.ReactNode> = {
    toolset: <ToolOutlined />,
    model: <ExperimentOutlined />,
    operator: <ExperimentOutlined />,
  };

  // Category-specific sub-labels
  const getCategoryTag = (record: AssetItem) => {
    if (record.asset_type === 'toolset') {
      if (record.category === '算子测试工具') return <Tag color="volcano">算子测试专用</Tag>;
      if (record.category === '模型部署测试工具') return <Tag color="cyan">模型部署专用</Tag>;
      return <Tag>通用</Tag>;
    }
    if (record.asset_type === 'operator') {
      if (record.category === '算子库') return <Tag color="purple">算子库</Tag>;
      return <Tag>{record.category || '其他'}</Tag>;
    }
    return record.category ? <Tag>{record.category}</Tag> : null;
  };

  const columns: ColumnsType<AssetItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => showDetail(record)} style={{ fontWeight: 500 }}>
          {typeIconMap[record.asset_type] && (
            <span style={{ marginRight: 6 }}>{typeIconMap[record.asset_type]}</span>
          )}
          {text}
        </a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'asset_type',
      key: 'asset_type',
      width: 100,
      render: (type: string) => {
        const found = ASSET_TYPES.find((t) => t.value === type);
        return <Tag color={typeColorMap[type]}>{found?.label || type}</Tag>;
      },
    },
    {
      title: '分类/用途',
      key: 'category',
      width: 140,
      render: (_: any, record: AssetItem) => getCategoryTag(record),
    },
    { title: '版本', dataIndex: 'version', key: 'version', width: 90 },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Badge
          status={status === 'active' ? 'success' : 'default'}
          text={status === 'active' ? '可用' : status}
        />
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) =>
        tags?.slice(0, 3).map((tag) => (
          <Tag key={tag} style={{ marginBottom: 2 }}>
            {tag}
          </Tag>
        )),
    },
    {
      title: '共享',
      dataIndex: 'is_shared',
      key: 'is_shared',
      width: 80,
      render: (shared: boolean, record) =>
        shared ? (
          <Tag color="green">{record.share_scope === 'platform' ? '全平台' : '组织内'}</Tag>
        ) : (
          <Tag>私有</Tag>
        ),
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 120, render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)}>
            详情
          </Button>
          <Popconfirm title="确定删除此资产？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: '全部' },
    ...ASSET_TYPES.map((t) => ({ key: t.value, label: t.label })),
  ];

  // Toolset detail panel for Deeplink_op_test
  const renderToolsetDetail = (asset: AssetItem) => (
    <div>
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="名称">{asset.name}</Descriptions.Item>
        <Descriptions.Item label="版本">{asset.version}</Descriptions.Item>
        <Descriptions.Item label="分类">{asset.category || '-'}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Badge status={asset.status === 'active' ? 'success' : 'default'} text={asset.status === 'active' ? '可用' : asset.status} />
        </Descriptions.Item>
        <Descriptions.Item label="共享范围">
          {asset.is_shared ? (asset.share_scope === 'platform' ? '全平台共享' : '组织内共享') : '私有'}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">{asset.created_at?.slice(0, 19).replace('T', ' ')}</Descriptions.Item>
        <Descriptions.Item label="描述" span={2}>{asset.description || '无'}</Descriptions.Item>
        <Descriptions.Item label="标签" span={2}>
          {asset.tags?.map((tag) => <Tag key={tag} color="blue">{tag}</Tag>)}
        </Descriptions.Item>
      </Descriptions>

      {asset.name.includes('Deeplink_op_test') && (
        <>
          <Card
            title={<><ToolOutlined style={{ marginRight: 8, color: '#1B3A6B' }} />工具集能力</>}
            size="small"
            style={{ marginBottom: 16, borderRadius: 8 }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #1B3A6B' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#1B3A6B' }}>
                    <CheckCircleFilled style={{ marginRight: 6 }} />算子精度验证
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#666', fontSize: 13, lineHeight: 2 }}>
                    <li>FP32 / FP16 / INT8 三精度对比测试</li>
                    <li>精度损失率自动计算（对比 FP32 基准）</li>
                    <li>INT8 量化精度 ≥96% 为通过标准</li>
                    <li>逐算子精度报告生成</li>
                  </ul>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #2196F3' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#2196F3' }}>
                    <CheckCircleFilled style={{ marginRight: 6 }} />算子性能 Benchmark
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#666', fontSize: 13, lineHeight: 2 }}>
                    <li>FP32 / FP16 / INT8 延迟(μs)对比</li>
                    <li>吞吐量(GOPS)测试与 H100 基线对比</li>
                    <li>延迟比值 &amp; 吞吐量比值自动计算</li>
                    <li>多设备横向性能对比支持</li>
                  </ul>
                </Card>
              </Col>
            </Row>
          </Card>

          <Card
            title={<><InfoCircleOutlined style={{ marginRight: 8 }} />内置算子库</>}
            size="small"
            style={{ marginBottom: 16, borderRadius: 8 }}
          >
            <Row gutter={[24, 12]}>
              <Col span={8}><Statistic title="内置算子总数" value={100} valueStyle={{ color: '#1B3A6B' }} /></Col>
              <Col span={8}><Statistic title="算子分类" value={10} suffix="类" valueStyle={{ color: '#2196F3' }} /></Col>
              <Col span={8}><Statistic title="H100 基线数据" value="全覆盖" valueStyle={{ color: '#52c41a', fontSize: 20 }} /></Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>算子分类覆盖：</div>
              <Space wrap>
                {['卷积类', '池化类', '激活函数', '归一化', '线性层', '注意力机制', '损失函数', '数据处理', '数学运算', '张量操作'].map((cat) => (
                  <Tag key={cat} color="blue">{cat}</Tag>
                ))}
              </Space>
            </div>
          </Card>

          <Card
            title="测试流程"
            size="small"
            style={{ borderRadius: 8 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              {[
                { step: '1', title: '选择设备', desc: '指定国产智算设备型号及数量' },
                { step: '2', title: '算子加载', desc: '从内置库加载算子并准备输入数据' },
                { step: '3', title: '精度测试', desc: 'FP32/FP16/INT8 精度逐一验证' },
                { step: '4', title: '性能测试', desc: '延迟和吞吐量 Benchmark' },
                { step: '5', title: '报告生成', desc: '自动生成对比报告并归档' },
              ].map((item, i) => (
                <div key={item.step} style={{ textAlign: 'center', flex: 1 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#1B3A6B',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px',
                      fontWeight: 700,
                    }}
                  >
                    {item.step}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>{item.desc}</div>
                  {i < 4 && (
                    <div style={{ position: 'absolute', right: -20, top: '50%', color: '#ccc' }}>→</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="资产列表"
        breadcrumbs={[{ title: '资产管理', path: '/assets/list' }, { title: '资产列表' }]}
        extra={
          <Button type="primary" icon={<UploadOutlined />} onClick={() => navigate('/assets/upload')}>
            上传资产
          </Button>
        }
      />

      <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key); setPage(1); }} items={tabItems} />

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input
          placeholder="搜索资产名称"
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => { setPage(1); fetchAssets(); }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={() => { setPage(1); fetchAssets(); }}>
          搜索
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      <Modal
        title={selectedAsset?.name || '资产详情'}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {selectedAsset && renderToolsetDetail(selectedAsset)}
      </Modal>
    </div>
  );
}
