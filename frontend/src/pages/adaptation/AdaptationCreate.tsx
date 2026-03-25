import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Collapse, Divider, Form, Input, InputNumber, Radio, Row, Select, Space, Steps, Switch, Tag, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { MODEL_TEST_TYPES } from '@/utils/constants';
import { getAssets } from '@/api/assets';
import { getResourceSummary } from '@/api/resources';
import { createAdaptation } from '@/api/adaptation';

const { TextArea } = Input;

const devicesTagMap: Record<string, string> = {
  '华为昇腾910C': 'huawei_910c',
  '华为昇腾910B': 'huawei_910b',
  '寒武纪MLU590': 'cambrian_590',
  '昆仑芯P800': 'kunlun_p800',
  '海光DCU BW1000': 'hygon_bw1000',
  '910C': 'huawei_910c',
  '910B': 'huawei_910b',
  'MLU590': 'cambrian_590',
  'P800': 'kunlun_p800',
  'BW1000': 'hygon_bw1000',
  'Ascend910C': 'huawei_910c',
  'Ascend910B': 'huawei_910b',
};

interface ImageOption {
  id: number;
  name: string;
  device_type?: string;
  tags?: string[];
}

interface DeviceOption {
  device_type: string;
  name: string;
  total_count: number;
  available_count: number;
}

const inferImageProfile = (image?: ImageOption) => {
  const tags = image?.tags || [];
  const name = image?.name || '';
  const hasAny = (keys: string[]) => keys.some((key) => tags.includes(key) || name.toLowerCase().includes(key.toLowerCase()));

  if (hasAny(['llm', 'text_generation', 'question_answering', 'code_generation'])) {
    return {
      title: '当前镜像偏向大模型推理',
      description: '建议优先关注采样参数、上下文长度、KV Cache 与并行策略。',
      tags: ['Temperature', 'Top P', 'Top K', '最大输入/输出 Token', 'KV Cache'],
    };
  }
  if (hasAny(['image_classification', 'object_detection', 'semantic_segmentation', 'image_generation', 'medical_imaging'])) {
    return {
      title: '当前镜像偏向视觉任务',
      description: '建议优先关注输入分辨率、Batch Size、精度模式与图优化。',
      tags: ['输入尺寸', 'Batch Size', '精度模式', '图优化'],
    };
  }
  if (hasAny(['speech_recognition', 'speech_synthesis'])) {
    return {
      title: '当前镜像偏向语音任务',
      description: '建议优先关注并发、线程数、排队延迟和精度模式。',
      tags: ['最大并发数', '线程数', '排队延迟', '精度模式'],
    };
  }
  if (hasAny(['multimodal', 'video_understanding'])) {
    return {
      title: '当前镜像偏向多模态任务',
      description: '建议兼顾输入尺寸、上下文长度、显存上限和并行配置。',
      tags: ['输入尺寸', '最大序列长度', '显存上限', 'Tensor Parallel'],
    };
  }
  return {
    title: '当前镜像使用通用适配策略',
    description: '建议从运行参数、精度模式和编译优化等级开始调整。',
    tags: ['Batch Size', '精度模式', '编译优化等级'],
  };
};

export default function AdaptationCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const selectedScenario = Form.useWatch('scenario_type', form);
  const selectedDeviceType = Form.useWatch('device_type', form);
  const selectedImageId = Form.useWatch('image_id', form);
  const [images, setImages] = useState<ImageOption[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resourceRes: any = await getResourceSummary();
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
        setDevices([]);
      }

      try {
        const pageSize = 100;
        const pages = [1, 2, 3];
        const results = await Promise.all(
          pages.map((page) => getAssets({ asset_type: 'image', page, page_size: pageSize })),
        );
        const mergedItems = results.flatMap((assetRes: any) => {
          const assetPayload = assetRes?.data || assetRes;
          return assetPayload?.items || assetPayload?.list || [];
        });
        setImages(
          Array.isArray(mergedItems)
            ? mergedItems.map((item: any) => ({
                id: item.id,
                name: item.name,
                device_type: Array.isArray(item.tags)
                  ? devicesTagMap[item.tags.find((tag: string) => typeof tag === 'string' && devicesTagMap[tag]) as string]
                  : item.name.includes('910C')
                    ? 'huawei_910c'
                    : item.name.includes('910B')
                      ? 'huawei_910b'
                      : item.name.includes('MLU590')
                        ? 'cambrian_590'
                        : item.name.includes('P800')
                          ? 'kunlun_p800'
                          : item.name.includes('BW1000')
                            ? 'hygon_bw1000'
                            : undefined,
                tags: Array.isArray(item.tags) ? item.tags : [],
              }))
            : [],
        );
      } catch {
        setImages([]);
      }
    })();
  }, []);

  const selectedDevice = useMemo(() => devices.find((item) => item.device_type === selectedDeviceType), [devices, selectedDeviceType]);
  const selectedImage = useMemo(() => images.find((item) => item.id === selectedImageId), [images, selectedImageId]);
  const selectedImageProfile = useMemo(() => inferImageProfile(selectedImage), [selectedImage]);
  const scenarioLabelMap = useMemo(
    () => Object.fromEntries(MODEL_TEST_TYPES.map((item) => [item.value, item.label])),
    [],
  );

  const filteredImages = useMemo(() => {
    if (!selectedScenario || !selectedDeviceType) return [];
    return images.filter((item) => item.device_type === selectedDeviceType && (item.tags || []).includes(selectedScenario));
  }, [images, selectedScenario, selectedDeviceType]);

  const handleScenarioChange = () => {
    form.setFieldsValue({ device_type: undefined, image_id: undefined });
  };

  const handleDeviceChange = (deviceType: string) => {
    const currentImageId = form.getFieldValue('image_id');
    const imageStillValid = images.some(
      (item) => item.id === currentImageId && item.device_type === deviceType && (item.tags || []).includes(form.getFieldValue('scenario_type')),
    );
    if (!imageStillValid) {
      form.setFieldValue('image_id', undefined);
    }
  };

  const handleNext = async () => {
    try {
      await form.validateFields(['scenario_type', 'device_type', 'image_id']);
      setCurrentStep(1);
    } catch {
      message.warning('请先完成子场景、设备和镜像选择');
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await createAdaptation({
        name: `适配任务-${values.image_id}`,
        image_id: values.image_id,
        device_type: values.device_type,
        device_count: 1,
        test_mode: values.test_mode,
        precision: values.precision,
        save_image: false,
        config: {
          include_in_ranking: values.include_in_ranking,
          scenario_type: values.scenario_type,
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
          temperature: values.temperature,
          top_p: values.top_p,
          top_k: values.top_k,
          repetition_penalty: values.repetition_penalty,
          max_input_tokens: values.max_input_tokens,
          max_output_tokens: values.max_output_tokens,
          beam_width: values.beam_width,
          tensor_parallel: values.tensor_parallel,
          pipeline_parallel: values.pipeline_parallel,
          instance_count: values.instance_count,
          num_threads: values.num_threads,
          queue_delay_ms: values.queue_delay_ms,
        },
      });
      message.success('适配任务已创建');
      form.resetFields();
      setCurrentStep(0);
      navigate('/adaptation/list');
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message;
      message.error(detail ? `创建适配任务失败：${detail}` : '创建适配任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      await form.validateFields(['scenario_type', 'device_type', 'image_id']);
      const values = form.getFieldsValue(true);
      await handleSubmit(values);
    } catch {
      message.warning('请先完成资源选择后再提交');
    }
  };

  return (
    <div>
      <PageHeader
        title="新建适配"
        breadcrumbs={[{ title: '适配系统', path: '/adaptation/list' }, { title: '新建适配' }]}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          batch_size: 1,
          concurrency: 1,
          precision: 'bf16',
          test_mode: 'standard',
          save_image: false,
          include_in_ranking: true,
          dynamic_batch: true,
          kv_cache: true,
          temperature: 0.7,
          top_p: 0.9,
          top_k: 50,
          repetition_penalty: 1.05,
          max_output_tokens: 2048,
          max_input_tokens: 4096,
          beam_width: 1,
          tensor_parallel: 1,
          pipeline_parallel: 1,
          instance_count: 1,
          num_threads: 8,
          queue_delay_ms: 50,
        }}
      >
        <Card className="tech-panel" style={{ marginBottom: 18 }}>
          <Steps
            current={currentStep}
            items={[
              { title: '选择资源', description: '子场景 / 设备 / 镜像' },
              { title: '参数适配', description: '调参与提交' },
            ]}
          />
        </Card>

        {currentStep === 0 ? (
          <Card className="tech-panel" style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>第一步：选择资源</div>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="scenario_type" label="子场景" rules={[{ required: true, message: '请选择子场景' }]}>
                  <Select
                    placeholder="先选择子场景"
                    onChange={handleScenarioChange}
                    options={MODEL_TEST_TYPES.map((item) => ({ label: item.label, value: item.value }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="device_type" label="芯片 / 设备" rules={[{ required: true, message: '请选择设备' }]}>
                  <Select
                    placeholder={selectedScenario ? '选择设备' : '请先选择子场景'}
                    disabled={!selectedScenario}
                    onChange={handleDeviceChange}
                    options={devices.map((item) => ({
                      label: `${item.name}（可用 ${item.available_count}/${item.total_count}）`,
                      value: item.device_type,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="image_id" label="模型部署镜像" rules={[{ required: true, message: '请选择镜像' }]}>
                  <Select
                    placeholder={!selectedScenario ? '请先选择子场景' : selectedDevice ? '选择该设备可用镜像' : '请先选择设备'}
                    disabled={!selectedScenario || !selectedDevice}
                    showSearch
                    optionFilterProp="label"
                    options={filteredImages.map((item) => ({
                      label: item.name,
                      value: item.id,
                      tags: item.tags || [],
                    }))}
                    optionRender={(option) => {
                      const data = option.data as { label?: string; tags?: string[] };
                      const scenarioTags = (data.tags || []).filter((tag) => scenarioLabelMap[tag]);
                      return (
                        <div style={{ padding: '4px 0' }}>
                          <div style={{ fontWeight: 600, color: '#102a4f', marginBottom: 6 }}>{data.label}</div>
                          {scenarioTags.length ? (
                            <Space size={[4, 4]} wrap>
                              {scenarioTags.map((tag) => (
                                <Tag key={tag} color={tag === selectedScenario ? 'blue' : 'default'} style={{ marginInlineEnd: 0 }}>
                                  {scenarioLabelMap[tag]}
                                </Tag>
                              ))}
                            </Space>
                          ) : null}
                        </div>
                      );
                    }}
                    notFoundContent={!selectedScenario ? '请先选择子场景' : selectedDevice ? '当前子场景与设备下暂无对应镜像' : '请先选择设备'}
                  />
                </Form.Item>
              </Col>
            </Row>

            {selectedScenario ? (
              <div style={{ marginBottom: 8 }}>
                <Tag color="purple">当前子场景：{MODEL_TEST_TYPES.find((item) => item.value === selectedScenario)?.label || selectedScenario}</Tag>
                {selectedDevice ? <Tag color="blue">当前设备：{selectedDevice.name}</Tag> : null}
                {selectedDevice ? <Tag color="green">可用 {selectedDevice.available_count}</Tag> : null}
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button type="primary" onClick={handleNext}>下一步：参数适配</Button>
            </div>
          </Card>
        ) : (
          <>
            <Card className="tech-panel" style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <Space wrap>
                  <Tag color="purple">子场景：{MODEL_TEST_TYPES.find((item) => item.value === selectedScenario)?.label || selectedScenario}</Tag>
                  {selectedDevice ? <Tag color="blue">设备：{selectedDevice.name}</Tag> : null}
                  {selectedImage ? <Tag color="gold">镜像：{selectedImage.name}</Tag> : null}
                </Space>
                <Button onClick={() => setCurrentStep(0)}>返回修改资源选择</Button>
              </div>
              {selectedImage ? (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 12 }}
                  message={`已选择镜像：${selectedImage.name}`}
                  description={
                    <div>
                      <div style={{ marginBottom: 8 }}>当前已进入参数适配阶段，可按镜像类型调整推理参数。</div>
                      <div style={{ fontWeight: 600, color: '#102a4f', marginBottom: 6 }}>{selectedImageProfile.title}</div>
                      <div style={{ marginBottom: 8 }}>{selectedImageProfile.description}</div>
                      <Space size={[6, 6]} wrap>
                        {selectedImageProfile.tags.map((tag) => (
                          <Tag key={tag} color="blue">{tag}</Tag>
                        ))}
                      </Space>
                    </div>
                  }
                />
              ) : null}
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
                        <Select options={[{ label: 'FP32', value: 'fp32' }, { label: 'FP16', value: 'fp16' }, { label: 'BF16', value: 'bf16' }, { label: 'INT8', value: 'int8' }, { label: 'INT4', value: 'int4' }]} />
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
                  <Divider style={{ margin: '8px 0 16px' }} />
                  <div style={{ fontWeight: 700, marginBottom: 16 }}>常用推理参数</div>
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item name="temperature" label="Temperature">
                        <InputNumber min={0} max={2} step={0.05} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="top_p" label="Top P">
                        <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="top_k" label="Top K">
                        <InputNumber min={0} max={200} step={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item name="max_input_tokens" label="最大输入 Token">
                        <InputNumber min={256} step={256} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="max_output_tokens" label="最大输出 Token">
                        <InputNumber min={64} step={64} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="repetition_penalty" label="重复惩罚">
                        <InputNumber min={0.8} max={2} step={0.01} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Collapse
                    ghost
                    items={[
                      {
                        key: 'advanced-inference',
                        label: '高级推理参数',
                        children: (
                          <Row gutter={16}>
                            <Col xs={24} md={8}>
                              <Form.Item name="beam_width" label="Beam Width">
                                <InputNumber min={1} max={16} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item name="queue_delay_ms" label="排队延迟(ms)">
                                <InputNumber min={0} step={10} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item name="num_threads" label="线程数">
                                <InputNumber min={1} step={1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                        ),
                      },
                    ]}
                  />
                </Card>

                <Card className="tech-panel" style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, marginBottom: 16 }}>核心优化项</div>
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
                        <Select options={[{ label: '标准', value: 'standard' }, { label: '增强', value: 'enhanced' }, { label: '激进', value: 'aggressive' }]} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="fallback_strategy" label="失败降级策略">
                        <Select options={[{ label: '不降级', value: 'none' }, { label: '降级到 FP16', value: 'fp16' }, { label: '降级到 FP32', value: 'fp32' }]} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Collapse
                    ghost
                    items={[
                      {
                        key: 'advanced-optimization',
                        label: '高级优化参数',
                        children: (
                          <Row gutter={16}>
                            <Col xs={24} md={8}>
                              <Form.Item name="tensor_parallel" label="Tensor Parallel">
                                <InputNumber min={1} max={16} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item name="pipeline_parallel" label="Pipeline Parallel">
                                <InputNumber min={1} max={16} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item name="instance_count" label="实例数">
                                <InputNumber min={1} max={16} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                        ),
                      },
                    ]}
                  />
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
                  <Form.Item name="include_in_ranking" label="是否参与榜单" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Alert
                    type="warning"
                    showIcon
                    message="当前版本暂不开放保存镜像"
                    description="为避免适配过程中出现异常或保存结果不稳定，创建适配任务时暂不提供保存镜像选项。"
                  />
                </Card>
              </Col>
            </Row>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(0)}>上一步</Button>
              <Button type="primary" onClick={handleFinalSubmit} loading={loading}>提交适配任务</Button>
            </div>
          </>
        )}
      </Form>
    </div>
  );
}
