import { useEffect, useMemo, useState } from 'react';
import { Card, Form, Select, Input, InputNumber, Radio, Switch, Button, Row, Col, Tag, Divider, Space, message } from 'antd';
import PageHeader from '@/components/PageHeader';
import { getAssets } from '@/api/assets';
import { getResourceSummary } from '@/api/resources';
import { createAdaptation } from '@/api/adaptation';

const { TextArea } = Input;

interface ImageOption {
  id: number;
  name: string;
}

interface DeviceOption {
  device_type: string;
  name: string;
  total_count: number;
  available_count: number;
}

export default function AdaptationCreate() {
  const [form] = Form.useForm();
  const [images, setImages] = useState<ImageOption[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [assetRes, resourceRes]: any = await Promise.all([
          getAssets({ asset_type: 'image', page: 1, page_size: 100 }),
          getResourceSummary(),
        ]);

        const assetPayload = assetRes?.data || assetRes;
        const assetItems = assetPayload?.items || assetPayload?.list || [];
        setImages(Array.isArray(assetItems) ? assetItems.map((item: any) => ({ id: item.id, name: item.name })) : []);

        const resourcePayload = resourceRes?.data || resourceRes;
        const deviceItems = resourcePayload?.devices_by_type || [];
        setDevices(
          Array.isArray(deviceItems)
            ? deviceItems.map((item: any) => ({
                device_type: item.device_type,
                name: item.name,
                total_count: item.total_count,
                available_count: item.available_count,
              }))
            : [],
        );
      } catch {
        setImages([]);
        setDevices([]);
      }
    })();
  }, []);

  const selectedDevice = useMemo(() => {
    const deviceType = form.getFieldValue('device_type');
    return devices.find((item) => item.device_type === deviceType);
  }, [devices, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await createAdaptation({
        name: values.saved_image_name || `适配任务-${values.image_id}`,
        image_id: values.image_id,
        device_type: values.device_type,
        device_count: 1,
        test_mode: values.test_mode,
        precision: values.precision,
        save_image: values.save_image,
        saved_image_name: values.saved_image_name,
        save_notes: values.save_notes,
        config: {
          batch_size: values.batch_size,
          concurrency: values.concurrency,
          memory_limit_gb: values.memory_limit_gb,
          max_sequence_length: values.max_sequence_length,
          input_resolution: values.input_resolution,
          dynamic_batch: values.dynamic_batch,
          kv_cache: values.kv_cache,
          graph_optimization: values.graph_optimization,
          compile_level: values.compile_level,
          fallback_strategy: values.fallback_strategy,
        },
      });
      message.success('适配任务已创建');
      form.resetFields();
    } catch {
      message.error('创建适配任务失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="新建适配"
        breadcrumbs={[{ title: '适配系统', path: '/adaptation/list' }, { title: '新建适配' }]}
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{
        batch_size: 1,
        concurrency: 1,
        precision: 'bf16',
        test_mode: 'standard',
        save_image: true,
        dynamic_batch: true,
        kv_cache: true,
      }}>
        <Card className="tech-panel" style={{ marginBottom: 18 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="image_id" label="模型部署镜像" rules={[{ required: true, message: '请选择镜像' }]}>
                <Select
                  placeholder="选择模型部署镜像"
                  options={images.map((item) => ({ label: item.name, value: item.id }))}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="device_type" label="运行设备" rules={[{ required: true, message: '请选择设备' }]}>
                <Select
                  placeholder="选择设备"
                  options={devices.map((item) => ({
                    label: `${item.name}（可用 ${item.available_count}/${item.total_count}）`,
                    value: item.device_type,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          {selectedDevice && (
            <div style={{ marginBottom: 8 }}>
              <Tag color="blue">当前设备：{selectedDevice.name}</Tag>
              <Tag color="green">可用 {selectedDevice.available_count}</Tag>
            </div>
          )}
        </Card>

        <Row gutter={16}>
          <Col xs={24} lg={14}>
            <Card className="tech-panel" style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>运行参数</div>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="batch_size" label="Batch Size">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="concurrency" label="最大并发数">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="memory_limit_gb" label="显存上限(GB)">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="precision" label="精度模式">
                    <Select
                      options={[
                        { label: 'FP32', value: 'fp32' },
                        { label: 'FP16', value: 'fp16' },
                        { label: 'BF16', value: 'bf16' },
                        { label: 'INT8', value: 'int8' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="max_sequence_length" label="最大序列长度">
                    <InputNumber min={128} step={128} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="input_resolution" label="输入尺寸">
                    <Input placeholder="例如 224x224 / 1024x1024" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card className="tech-panel" style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>优化选项</div>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="dynamic_batch" label="动态 Batch" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="kv_cache" label="KV Cache" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="graph_optimization" label="图优化" valuePropName="checked">
                    <Switch defaultChecked />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="compile_level" label="编译优化等级">
                    <Select
                      options={[
                        { label: '标准', value: 'standard' },
                        { label: '增强', value: 'enhanced' },
                        { label: '激进', value: 'aggressive' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="fallback_strategy" label="失败降级策略">
                    <Select
                      options={[
                        { label: '不降级', value: 'none' },
                        { label: '降级到 FP16', value: 'fp16' },
                        { label: '降级到 FP32', value: 'fp32' },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card className="tech-panel" style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>测试模式</div>
              <Form.Item name="test_mode">
                <Radio.Group style={{ width: '100%' }}>
                  <Space direction="vertical">
                    <Radio value="quick">快速测试</Radio>
                    <Radio value="standard">标准测试</Radio>
                    <Radio value="stress">压力测试</Radio>
                    <Radio value="compatibility">兼容性测试</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>
              <Divider />
              <Form.Item name="save_image" label="保存镜像" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="saved_image_name" label="保存后的镜像名称">
                <Input placeholder="例如 qwen2.5-7b-adapted-v1" />
              </Form.Item>
              <Form.Item name="save_notes" label="镜像说明">
                <TextArea rows={4} placeholder="填写镜像说明、适配结果或标签" />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            提交适配任务
          </Button>
        </div>
      </Form>
    </div>
  );
}
