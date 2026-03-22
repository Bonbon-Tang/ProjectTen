import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Popconfirm, message, Tag, Input } from 'antd';
import { SearchOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { getArchives, deleteArchive } from '@/api/reports';
import dayjs from 'dayjs';

interface ArchiveItem {
  id: number;
  user_id: number;
  report_id: number;
  note?: string;
  archived_at?: string;
  // 关联的报告信息（需要从后端返回或前端关联）
  report_title?: string;
  report_type?: string;
  report_status?: string;
  eval_name?: string;
  progress?: number;
}

// 报告类型映射
const REPORT_TYPE_MAP: Record<string, { label: string; color?: string }> = {
  basic: { label: '基础报告' },
  advanced: { label: '高级报告' },
  custom: { label: '自定义报告' },
  performance: { label: '性能报告' },
  accuracy: { label: '精度报告' },
  comparison: { label: '对比报告' },
  comprehensive: { label: '综合报告' },
};

export default function MyArchives() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ArchiveItem[]>([]);
  const [keyword, setKeyword] = useState('');

  const fetchArchives = async () => {
    setLoading(true);
    try {
      const res: any = await getArchives();
      const resData = res?.data || res;
      const items = resData?.data || resData?.items || resData?.list || resData || [];
      if (Array.isArray(items)) {
        setData(items);
      }
    } catch (error) {
      console.error('Failed to fetch archives:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteArchive(id);
      message.success('已取消存档');
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch {
      message.error('取消存档失败');
    }
  };

  const columns: ColumnsType<ArchiveItem> = [
    {
      title: '报告名称',
      dataIndex: 'report_title',
      key: 'report_title',
      ellipsis: true,
      render: (text: string, record) => (
        <a onClick={() => navigate(`/reports/${record.report_id}`)} style={{ fontWeight: 500 }}>
          {text || `报告 #${record.report_id}`}
        </a>
      ),
    },
    {
      title: '报告类型',
      dataIndex: 'report_type',
      key: 'report_type',
      width: 120,
      render: (val: string) => {
        const type = REPORT_TYPE_MAP[val] || { label: val };
        return <Tag color={type.color}>{type.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'report_status',
      key: 'report_status',
      width: 130,
      render: (status: string, record) => (
        <StatusTag status={status || 'published'} progress={record.progress} />
      ),
    },
    {
      title: '关联评测',
      dataIndex: 'eval_name',
      key: 'eval_name',
      ellipsis: true,
      render: (text: string, record) => text || `Report #${record.report_id}`,
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      width: 200,
      ellipsis: true,
      render: (text: string) => text || <span style={{ color: '#ccc' }}>无</span>,
    },
    {
      title: '存档时间',
      dataIndex: 'archived_at',
      key: 'archived_at',
      width: 170,
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/reports/${record.report_id}`)}
          >
            查看
          </Button>
          <Popconfirm title="确定取消存档？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              取消存档
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="我的存档"
        breadcrumbs={[{ title: '报告管理', path: '/reports/list' }, { title: '我的存档' }]}
      />
      <div style={{ marginBottom: 16, color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
        查看您收藏和归档的评测报告
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input
          placeholder="搜索报告名称"
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={fetchArchives}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetchArchives}>
          搜索
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${data.length} 条`,
        }}
        locale={{ emptyText: '暂无存档报告' }}
      />
    </div>
  );
}
