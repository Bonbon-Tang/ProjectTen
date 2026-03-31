import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Select, Upload, Button, message, Space, Tag, Progress } from 'antd';
import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import PageHeader from '@/components/PageHeader';
import { ASSET_TYPES } from '@/utils/constants';

const { TextArea } = Input;
const { Dragger } = Upload;

export default function AssetUpload() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [inputTag, setInputTag] = useState('');

  const handleAddTag = () => {
    if (inputTag && !tags.includes(inputTag)) {
      setTags([...tags, inputTag]);
      setInputTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    action: `${import.meta.env.VITE_API_BASE_URL}/assets/upload`,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    onChange(info) {
      if (info.file.status === 'uploading') {
        setUploadProgress(info.file.percent || 0);
      }
      if (info.file.status === 'done') {
        message.success('文件上传成功');
        setUploadProgress(100);
      } else if (info.file.status === 'error') {
        message.error('文件上传失败');
      }
    },
    beforeUpload() {
      // Let the form handle submit
      return false;
    },
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // API call would go here
      message.success('资产上传成功');
      navigate('/assets/list');
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="上传资产"
        breadcrumbs={[{ title: '资产管理', path: '/assets/list' }, { title: '上传资产' }]}
      />

      <Card style={{ maxWidth: 700, borderRadius: 8 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="资产名称"
            rules={[{ required: true, message: '请输入资产名称' }]}
          >
            <Input placeholder="请输入资产名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="资产类型"
            rules={[{ required: true, message: '请选择资产类型' }]}
          >
            <Select placeholder="请选择资产类型" options={ASSET_TYPES} />
          </Form.Item>

          <Form.Item name="version" label="版本号" initialValue="v1.0.0">
            <Input placeholder="例如: v1.0.0" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入资产描述" maxLength={500} showCount />
          </Form.Item>

          <Form.Item label="标签">
            <div style={{ marginBottom: 8 }}>
              {tags.map((tag) => (
                <Tag key={tag} closable onClose={() => handleRemoveTag(tag)} style={{ marginBottom: 4 }}>
                  {tag}
                </Tag>
              ))}
            </div>
            <Space>
              <Input
                size="small"
                placeholder="添加标签"
                value={inputTag}
                onChange={(e) => setInputTag(e.target.value)}
                onPressEnter={handleAddTag}
                style={{ width: 150 }}
              />
              <Button size="small" onClick={handleAddTag}>
                添加
              </Button>
            </Space>
          </Form.Item>

          <Form.Item name="file" label="上传文件" rules={[{ required: true, message: '请上传文件' }]}>
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#1B3A6B', fontSize: 48 }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">支持模型文件、数据集、脚本等。单文件最大 10GB。</p>
            </Dragger>
          </Form.Item>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <Progress percent={uploadProgress} style={{ marginBottom: 16 }} />
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<UploadOutlined />}>
                提交
              </Button>
              <Button onClick={() => navigate('/assets/list')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
