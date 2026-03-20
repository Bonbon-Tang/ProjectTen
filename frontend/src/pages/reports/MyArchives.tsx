import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Popconfirm, message, Tag, Input } from 'antd';
import { SearchOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/PageHeader';
import { getArchives, deleteArchive } from '@/api/reports';
import dayjs from 'dayjs';

interface ArchiveItem {
  id: string;
  report_name: string;
  eval_type: string;
  archived_at: string;
  remark: string;
  report_id: string;
}

export default function MyArchives() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<ArchiveItem[]>([
    {
      id: '1',
      report_name: 'LLM推理测试-华为昇腾910C-评测报告',
      eval_type: '模型测试 / 大语言模型',
      archived_at: '2026-03-19 11:00:00',
      remark: '首次910C推理测试基准',
      report_id: 'r1',
    },
    {
      id: '2',
      report_name: '精度验证-寒武纪MLU590-评测报告',
      eval_type: '算子测试 / 精度验证',
      archived_at: '2026-03-18 14:30:00',
      remark: '',
      report_id: 'r2',
    },
    {
      id: '3',
      report_name: '目标检测-昆仑芯P800-评测报告',
      eval_type: '模型测试 / 目标检测',
      archived_at: '2026-03-17 09:15:00',
      remark: 'P800上YOLO性能参考',
      report_id: 'r3',
    },
  ]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 3 });

  const fetchArchives = async () => {
    setLoading(true);
    try {
      const res: any = await getArchives({ keyword, page: pagination.current, page_size: pagination.pageSize });
      const items = res?.data?.items || res?.items || [];
      if (Array.isArray(items) && items.length > 0) {
        setData(items);
        setPagination((prev) => ({ ...prev, total: res?.data?.total || res?.total || items.length }));
      }
    } catch {
      // 使用 mock 数据
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteArchive(id);
      message.success('存档已删除');
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<ArchiveItem> = [
    {
      title: '报告名称',
      dataIndex: 'report_name',
      key: 'report_name',
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/reports/${record.report_id}`)} style={{ fontWeight: 500 }}>
          {text}
        </a>
      ),
    },
    {
      title: '评测类型',
      dataIndex: 'eval_type',
      key: 'eval_type',
      width: 200,
      render: (val: string) => <Tag color="geekblue">{val}</Tag>,
    },
    {
      title: '存档时间',
      dataIndex: 'archived_at',
      key: 'archived_at',
      width: 170,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      render: (text: string) => text || <span style={{ color: '#ccc' }}>无</span>,
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
          <Popconfirm title="确定删除此存档？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
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
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
        }}
      />
    </div>
  );
}
