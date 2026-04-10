import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Input, Select, DatePicker, Modal, Switch, message, Tag } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Key } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import {
  EVAL_CATEGORIES,
  OPERATOR_TEST_TYPES,
  MODEL_TEST_TYPES,
  DEVICE_TYPES,
} from '@/utils/constants';
import {
  getEvaluations,
  deleteEvaluation,
  startEvaluation,
  stopEvaluation,
  retryEvaluation,
  batchDeleteEvaluations,
  setEvaluationPostActions,
} from '@/api/evaluations';
import { extractErrorMessage } from '@/utils/error';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

// 合并子类型
const ALL_SUB_TYPES = [...OPERATOR_TEST_TYPES, ...MODEL_TEST_TYPES];

function getSubTypeLabel(val: string): string {
  return ALL_SUB_TYPES.find((t) => t.value === val)?.label || val;
}

interface EvalItem {
  id: string;
  name: string;
  description?: string;

  // unified routing core
  task: 'operator' | 'model_deployment';
  scenario: string;
  chips: string;
  chip_num: number;
  image_id?: number;
  tool_id?: number;

  // status/meta
  status: string;
  priority: string;
  visibility?: string;
  creator_id?: number;
  created_at: string;
  updated_at?: string;
  progress?: number;
  config?: Record<string, any>;

  // operator-only
  operator_count?: number;
  operator_categories?: string[];
  operator_lib_id?: number;

  // extra display fields
  image_name?: string;
  model_name?: string;
  chip_name?: string;
  framework_name?: string;
}

export default function EvalList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EvalItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState<{
    status?: string;
    task?: string;
    chips?: string;
    keyword?: string;
  }>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 是否有 running 任务
  const hasRunning = data.some((item) => item.status === 'running');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getEvaluations({
        ...filters,
        page: pagination.current,
        page_size: pagination.pageSize,
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
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // running 状态轮询 - 每5秒刷新列表
  useEffect(() => {
    if (hasRunning) {
      pollTimerRef.current = setInterval(() => {
        fetchData();
      }, 5000);
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [hasRunning, fetchData]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleDeleteSingle = (record: EvalItem) => {
    if (record.status === 'running') {
      message.warning('运行中的任务不允许删除');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除任务「${record.name}」吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteEvaluation(record.id);
          message.success('删除成功');
          fetchData();
          setSelectedRowKeys((prev) => prev.filter((k) => k !== record.id));
        } catch (error) {
          message.error(extractErrorMessage(error, '删除失败'));
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的任务');
      return;
    }

    // 过滤掉 running 状态的任务
    const deletableItems = data.filter(
      (item) => selectedRowKeys.includes(item.id) && item.status !== 'running',
    );
    const skippedCount = selectedRowKeys.length - deletableItems.length;

    if (deletableItems.length === 0) {
      message.warning('所有选中的任务都处于运行中状态，无法删除');
      return;
    }

    const content = skippedCount > 0
      ? `将删除 ${deletableItems.length} 个任务（已自动跳过 ${skippedCount} 个运行中的任务），此操作不可恢复。`
      : `确定要删除选中的 ${deletableItems.length} 个任务吗？此操作不可恢复。`;

    Modal.confirm({
      title: '批量删除确认',
      icon: <ExclamationCircleOutlined />,
      content,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setBatchDeleting(true);
        try {
          const taskIds = deletableItems.map((item) => Number(item.id));
          await batchDeleteEvaluations(taskIds);
          message.success(`成功删除 ${deletableItems.length} 个任务`);
          setSelectedRowKeys([]);
          fetchData();
        } catch (error) {
          message.error(extractErrorMessage(error, '批量删除失败'));
        } finally {
          setBatchDeleting(false);
        }
      },
    });
  };

  const handleStart = async (id: string) => {
    try {
      await startEvaluation(id);
      message.success('任务已启动');
      fetchData();
    } catch (error) {
      message.error(extractErrorMessage(error, '启动失败'));
    }
  };

  const handleStop = async (id: string) => {
    try {
      await stopEvaluation(id);
      message.success('任务已停止');
      fetchData();
    } catch (error) {
      message.error(extractErrorMessage(error, '停止失败'));
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await retryEvaluation(id);
      message.success('任务已重新启动');
      fetchData();
    } catch (error) {
      message.error(extractErrorMessage(error, '重试失败'));
    }
  };

  const handlePostActions = (record: EvalItem) => {
    let saveImage = Boolean(record.config?.save_image);
    let includeInRanking = record.config?.include_in_ranking ?? true;

    Modal.confirm({
      title: '完成后操作',
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>是否保存镜像</span>
            <Switch defaultChecked={saveImage} onChange={(checked) => { saveImage = checked; }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>是否参与模型部署榜单</span>
            <Switch defaultChecked={includeInRanking} onChange={(checked) => { includeInRanking = checked; }} />
          </div>
        </Space>
      ),
      okText: '保存设置',
      cancelText: '取消',
      onOk: async () => {
        try {
          await setEvaluationPostActions(record.id, {
            save_image: saveImage,
            include_in_ranking: includeInRanking,
          });
          message.success('设置已保存');
          fetchData();
        } catch (error) {
          message.error(extractErrorMessage(error, '保存设置失败'));
        }
      },
    });
  };

  const columns: ColumnsType<EvalItem> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/evaluations/${record.id}`)} style={{ fontWeight: 500 }}>
          {text}
        </a>
      ),
    },
    {
      title: '评测大类',
      dataIndex: 'task',
      key: 'task',
      width: 110,
      render: (val: string) => {
        const label = val === 'operator' ? '算子测试' : '模型部署测试';
        const icon = val === 'operator' ? '🧩' : '🤖';
        return <Tag>{icon} {label}</Tag>;
      },
    },
    {
      title: '子场景',
      dataIndex: 'scenario',
      key: 'scenario',
      width: 160,
      render: (val: string) => {
        const legacy = val === 'operator_accuracy_performance' ? 'operator_perf_accuracy' : val;
        return <Tag color="geekblue">{getSubTypeLabel(legacy)}</Tag>;
      },
    },
    {
      title: '设备类型',
      dataIndex: 'chips',
      key: 'chips',
      width: 140,
      render: (val: string) => {
        const d = DEVICE_TYPES.find((dv) => dv.value === val);
        return d ? <span style={{ color: d.color, fontWeight: 500 }}>{d.label}</span> : val;
      },
    },
    {
      title: '模型',
      dataIndex: 'model_name',
      key: 'model_name',
      width: 120,
      render: (val: string, record) => {
        if (!val) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Space direction="vertical" size={0}>
            <span style={{ fontWeight: 500 }}>{val}</span>
            {record.framework_name && (
              <span style={{ fontSize: 11, color: '#999' }}>{record.framework_name}</span>
            )}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string, record) => (
        <StatusTag status={status} progress={record.progress} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/evaluations/${record.id}`)}>
            查看
          </Button>
          {(record.status === 'pending' || record.status === 'queued') && (
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStart(record.id)}>
              启动
            </Button>
          )}
          {record.status === 'running' && (
            <Button type="link" size="small" danger icon={<PauseCircleOutlined />} onClick={() => handleStop(record.id)}>
              停止
            </Button>
          )}
          {record.status === 'completed' && record.task === 'model_deployment' && (
            <Button type="link" size="small" onClick={() => handlePostActions(record)}>
              完成后操作
            </Button>
          )}
          {(record.status === 'failed' || record.status === 'terminated') && (
            <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => handleRetry(record.id)}>
              重试
            </Button>
          )}
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={record.status === 'running'}
            onClick={() => handleDeleteSingle(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div>
      <PageHeader
        title="评测任务"
        breadcrumbs={[{ title: '评测系统', path: '/evaluations/list' }, { title: '评测任务' }]}
        extra={
          <Space>
            {selectedRowKeys.length > 0 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={batchDeleting}
                onClick={handleBatchDelete}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/evaluations/create')}>
              创建任务
            </Button>
          </Space>
        }
      />

      {/* 筛选器 */}
      <div className="tech-filter-bar">
        <Input
          placeholder="搜索任务名称"
          prefix={<SearchOutlined />}
          style={{ width: 240 }}
          allowClear
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
        />
        <Select
          placeholder="评测大类"
          style={{ width: 160 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, task: value })}
          options={[
            { label: '🧩 算子测试', value: 'operator' },
            { label: '🤖 模型部署测试', value: 'model_deployment' },
          ]}
        />
        <Select
          placeholder="设备类型"
          style={{ width: 160 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, chips: value })}
          options={DEVICE_TYPES.map((d) => ({ label: d.label, value: d.value }))}
        />
        <Select
          placeholder="状态筛选"
          style={{ width: 140 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, status: value })}
          options={[
            { label: '待执行', value: 'pending' },
            { label: '排队中', value: 'queued' },
            { label: '运行中', value: 'running' },
            { label: '已完成', value: 'completed' },
            { label: '失败', value: 'failed' },
            { label: '已终止', value: 'terminated' },
          ]}
        />
        <RangePicker style={{ width: 260 }} />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
      </div>

      <div className="tech-panel" style={{ padding: 12 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
          }}
        />
      </div>
    </div>
  );
}
