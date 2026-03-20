import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Steps,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Descriptions,
  Tag,
  InputNumber,
  Row,
  Col,
  Radio,
  Alert,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import {
  EVAL_CATEGORIES,
  OPERATOR_TEST_TYPES,
  MODEL_TEST_TYPES,
  PRIORITY_MAP,
} from '@/utils/constants';
import { createEvaluation } from '@/api/evaluations';
import { getAssets } from '@/api/assets';
import { getResourceSummary } from '@/api/resources';
import { getBenchmarkCategories, getBenchmarkSummary } from '@/api/benchmark';
import { getAvailableImages } from '@/api/modelBenchmark';
import dayjs from 'dayjs';

const { TextArea } = Input;

export default function EvalCreate() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Step 1: 大类
  const [taskCategory, setTaskCategory] = useState<string>('');
  // Step 2: 子类型
  const [taskType, setTaskType] = useState<string>('');
  const [typeSearch, setTypeSearch] = useState('');
  // Step 3: 参数 (form driven)
  // Step 4: 确认

  // 工具集列表 — 分两类: 算子测试工具 vs 模型部署测试工具
  const [operatorToolsets, setOperatorToolsets] = useState<{ id: number; name: string }[]>([]);
  const [modelToolsets, setModelToolsets] = useState<{ id: number; name: string }[]>([]);
  const [toolsetsLoading, setToolsetsLoading] = useState(false);
  // 算子库列表（独立于工具集）
  const [operatorLibs, setOperatorLibs] = useState<{ id: number; name: string; description?: string }[]>([]);
  const [operatorLibsLoading, setOperatorLibsLoading] = useState(false);
  // 模型部署镜像列表
  const [modelImages, setModelImages] = useState<{ id: number; name: string; description?: string; tags?: string[] }[]>([]);
  const [modelImagesLoading, setModelImagesLoading] = useState(false);
  // Cache form values before leaving step 2 so they survive unmount
  const [cachedFormValues, setCachedFormValues] = useState<any>({});

  // 真实设备数据（从后端获取）
  interface DeviceInfo {
    device_type: string;
    name: string;
    manufacturer: string;
    total_count: number;
    available_count: number;
    status: string;
  }
  const [deviceList, setDeviceList] = useState<DeviceInfo[]>([]);

  // 算子分类列表（从后端获取）
  interface OpCategoryInfo {
    category: string;
    count: number;
  }
  const [operatorCategories, setOperatorCategories] = useState<OpCategoryInfo[]>([]);
  const [totalOperatorCount, setTotalOperatorCount] = useState<number>(0);

  // 获取算子分类
  const fetchOperatorCategories = useCallback(async () => {
    try {
      const res: any = await getBenchmarkCategories();
      const list = res?.data || res;
      if (Array.isArray(list)) {
        setOperatorCategories(list);
      }
      // Also fetch summary for total count
      const summaryRes: any = await getBenchmarkSummary();
      const summaryData = summaryRes?.data || summaryRes;
      if (summaryData?.total_operators) {
        setTotalOperatorCount(summaryData.total_operators);
      }
    } catch {
      // silent
    }
  }, []);

  // 获取真实设备资源
  const fetchDevices = useCallback(async () => {
    try {
      const res: any = await getResourceSummary();
      const data = res?.data || res;
      const devices = data?.devices_by_type || data?.devices || [];
      if (Array.isArray(devices)) {
        setDeviceList(devices);
      }
    } catch {
      // fallback: empty
    }
  }, []);

  // 从 GET /api/v1/assets?asset_type=toolset 获取工具集, 按category分组
  const fetchToolsets = () => {
    setToolsetsLoading(true);
    getAssets({ type: 'toolset', page_size: 100 })
      .then((res: any) => {
        const list = res?.data?.items || res?.items || res?.data || [];
        if (Array.isArray(list)) {
          const opTools: { id: number; name: string }[] = [];
          const modelTools: { id: number; name: string }[] = [];
          list.forEach((item: any) => {
            if (item.category === '算子测试工具') {
              opTools.push({ id: item.id, name: item.name });
            } else if (item.category === '模型部署测试工具') {
              modelTools.push({ id: item.id, name: item.name });
            } else {
              // Legacy or uncategorized — show in both
              opTools.push({ id: item.id, name: item.name });
              modelTools.push({ id: item.id, name: item.name });
            }
          });
          setOperatorToolsets(opTools);
          setModelToolsets(modelTools);
        }
      })
      .catch(() => {})
      .finally(() => { setToolsetsLoading(false); });
  };

  // 从 GET /api/v1/assets?asset_type=operator&category=算子库 获取算子库列表
  const fetchOperatorLibs = () => {
    setOperatorLibsLoading(true);
    getAssets({ asset_type: 'operator', category: '算子库', page_size: 100 })
      .then((res: any) => {
        const list = res?.data?.items || res?.items || res?.data || [];
        if (Array.isArray(list)) {
          setOperatorLibs(list.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
          })));
        }
      })
      .catch(() => {})
      .finally(() => { setOperatorLibsLoading(false); });
  };

  // 从 GET /api/v1/model-benchmark/images 获取模型部署镜像列表
  const fetchModelImages = () => {
    setModelImagesLoading(true);
    getAvailableImages()
      .then((res: any) => {
        const list = res?.data || res || [];
        if (Array.isArray(list)) {
          setModelImages(list.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            tags: item.tags,
          })));
        }
      })
      .catch(() => {})
      .finally(() => { setModelImagesLoading(false); });
  };

  useEffect(() => {
    fetchToolsets();
    fetchOperatorLibs();
    fetchModelImages();
    fetchDevices();
    fetchOperatorCategories();
  }, []);

  const steps = [
    { title: '选择评测大类' },
    { title: '选择子类型' },
    { title: '配置测试参数' },
    { title: '确认提交' },
  ];

  // 子类型列表
  const subTypes = useMemo(() => {
    if (taskCategory === 'operator_test') return OPERATOR_TEST_TYPES;
    if (taskCategory === 'model_test') return MODEL_TEST_TYPES;
    return [];
  }, [taskCategory]);

  // 搜索过滤后的子类型
  const filteredSubTypes = useMemo(() => {
    if (!typeSearch) return subTypes;
    const kw = typeSearch.toLowerCase();
    return subTypes.filter(
      (t) =>
        t.label.toLowerCase().includes(kw) ||
        t.value.toLowerCase().includes(kw) ||
        t.description.toLowerCase().includes(kw),
    );
  }, [subTypes, typeSearch]);

  const isOperatorTest = taskCategory === 'operator_test';

  // 自动生成默认任务名
  const generateDefaultName = (deviceVal?: string) => {
    const subType = subTypes.find((t) => t.value === taskType);
    const today = dayjs().format('YYYYMMDD');
    const device = deviceList.find((d) => d.device_type === deviceVal);
    const shortDevice = device ? device.name.split(' ')[0] : '设备';
    return `${subType?.label || '评测'}-${shortDevice}-${today}`;
  };

  const handleNext = async () => {
    if (current === 0) {
      if (!taskCategory) {
        message.warning('请选择评测大类');
        return;
      }
      setCurrent(1);
      return;
    }
    if (current === 1) {
      if (!taskType) {
        message.warning('请选择子类型');
        return;
      }
      // 进入步骤3时，预填默认值
      const subType = subTypes.find((t) => t.value === taskType);
      const today = dayjs().format('YYYYMMDD');
      const defaults: any = {
        name: `${subType?.label || '评测'}-${today}`,
        priority: 'medium',
      };

      // 算子测试默认选中工具集 Deeplink_op_test
      if (isOperatorTest) {
        const defaultToolset = operatorToolsets.find(
          (t) => t.name === 'Deeplink_op_test' || t.name.includes('Deeplink_op_test'),
        );
        if (defaultToolset) {
          defaults.toolset_id = defaultToolset.id;
        }
      }

      form.setFieldsValue(defaults);
      setCurrent(2);
      return;
    }
    if (current === 2) {
      try {
        await form.validateFields();

        // 算子测试必须选择工具集
        if (isOperatorTest && !form.getFieldValue('toolset_id')) {
          message.warning('算子测试必须选择工具集');
          return;
        }

        // Cache form values before leaving this step
        setCachedFormValues(form.getFieldsValue());
        setCurrent(3);
      } catch {
        // validation errors shown inline
      }
      return;
    }
  };

  const handlePrev = () => {
    if (current === 1) {
      setTaskType('');
      setTypeSearch('');
    }
    setCurrent(current - 1);
  };

  const handleSubmit = async () => {
    // Re-fetch device info to get latest availability
    await fetchDevices();

    const formValues = form.getFieldsValue();
    const values = { ...cachedFormValues, ...formValues };
    const deviceCount = values.device_count ?? 1;
    const device = deviceList.find((d) => d.device_type === values.device_type);

    // Block submission if requested devices exceed available
    if (device && deviceCount > device.available_count) {
      message.error(`设备数量不足：需要 ${deviceCount} 台 ${device.name}，当前空闲仅 ${device.available_count} 台`);
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        name: values.name,
        description: values.description || undefined,
        task_category: taskCategory as 'operator_test' | 'model_test',
        task_type: taskType,
        device_type: values.device_type,
        device_count: deviceCount,
        toolset_id: values.toolset_id,
        priority: values.priority,
      };

      // Include operator-specific params for operator_test
      if (taskCategory === 'operator_test') {
        if (values.operator_count) {
          params.operator_count = values.operator_count;
        }
        if (values.operator_categories && values.operator_categories.length > 0) {
          params.operator_categories = values.operator_categories;
        }
        if (values.operator_lib_id) {
          params.operator_lib_id = values.operator_lib_id;
        }
      }

      // Include image_id for model_test
      if (taskCategory === 'model_test' && values.image_id) {
        params.image_id = values.image_id;
      }
      const res: any = await createEvaluation(params);
      message.success('评测任务创建成功！');
      const newId = res?.data?.id || res?.id;
      if (newId) {
        navigate(`/evaluations/${newId}`);
      } else {
        navigate('/evaluations/list');
      }
    } catch {
      message.error('创建任务失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 找到对应标签文本
  const getCategoryLabel = (val: string) =>
    EVAL_CATEGORIES.find((c) => c.value === val)?.label || val;
  const getSubTypeLabel = (val: string) =>
    subTypes.find((t) => t.value === val)?.label || val;
  const getDeviceLabel = (val: string) =>
    deviceList.find((d) => d.device_type === val)?.name || val;

  // ---- 渲染各步骤 ----

  const renderStep0 = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24, color: '#666' }}>请选择评测大类</div>
      <Row gutter={24} justify="center">
        {EVAL_CATEGORIES.map((cat) => (
          <Col key={cat.value} xs={24} sm={12} md={10}>
            <Card
              hoverable
              onClick={() => setTaskCategory(cat.value)}
              style={{
                textAlign: 'center',
                borderRadius: 12,
                border:
                  taskCategory === cat.value
                    ? '2px solid #1B3A6B'
                    : '2px solid transparent',
                background: taskCategory === cat.value ? '#f0f5ff' : '#fff',
                cursor: 'pointer',
                marginBottom: 16,
              }}
              styles={{ body: { padding: '40px 24px' } }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>{cat.icon}</div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#1B3A6B',
                  marginBottom: 8,
                }}
              >
                {cat.label}
              </div>
              <div style={{ color: '#999', fontSize: 14 }}>
                {cat.value === 'operator_test'
                  ? '验证算子精度与性能表现'
                  : '测试AI模型在智算设备上的推理能力'}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16, color: '#666' }}>
        当前大类：<Tag color="blue">{getCategoryLabel(taskCategory)}</Tag>
      </div>
      {taskCategory === 'model_test' && (
        <div style={{ maxWidth: 400, margin: '0 auto 20px' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索子场景..."
            allowClear
            value={typeSearch}
            onChange={(e) => setTypeSearch(e.target.value)}
          />
        </div>
      )}
      <Row
        gutter={[16, 16]}
        justify={isOperatorTest ? 'center' : 'start'}
      >
        {filteredSubTypes.map((st) => (
          <Col key={st.value} xs={24} sm={12} md={isOperatorTest ? 10 : 6}>
            <Card
              hoverable
              size="small"
              onClick={() => setTaskType(st.value)}
              style={{
                borderRadius: 10,
                border:
                  taskType === st.value
                    ? '2px solid #1B3A6B'
                    : '2px solid transparent',
                background: taskType === st.value ? '#f0f5ff' : '#fff',
                cursor: 'pointer',
                height: '100%',
              }}
              styles={{ body: { padding: '16px' } }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#1B3A6B',
                  marginBottom: 6,
                }}
              >
                {st.label}
              </div>
              <div style={{ color: '#999', fontSize: 12, lineHeight: 1.5 }}>
                {st.description}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      {filteredSubTypes.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          没有匹配的子场景
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Form form={form} layout="vertical" preserve={true}>
        <Form.Item
          name="name"
          label="任务名称"
          rules={[{ required: true, message: '请输入任务名称' }]}
        >
          <Input placeholder="请输入任务名称" />
        </Form.Item>

        <Form.Item
          name="device_type"
          label="选择设备类型"
          rules={[{ required: true, message: '请选择设备类型' }]}
        >
          <Select
            placeholder="选择智算设备"
            onChange={() => {
              form.setFieldsValue({ device_count: 1 });
              const dv = form.getFieldValue('device_type');
              form.setFieldsValue({
                name: generateDefaultName(dv),
              });
            }}
            options={deviceList.filter(d => d.status === 'online').map((d) => ({
              label: `${d.name} (空闲 ${d.available_count} / 共 ${d.total_count} 台)`,
              value: d.device_type,
              disabled: d.available_count === 0,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="device_count"
          label="设备数量"
          rules={[{ required: true, message: '请输入设备数量' }]}
          extra={(() => {
            const dv = form.getFieldValue('device_type');
            const device = deviceList.find((d) => d.device_type === dv);
            if (device) {
              return `当前 ${device.name} 空闲 ${device.available_count} 台，共 ${device.total_count} 台`;
            }
            return undefined;
          })()}
        >
          <InputNumber
            min={1}
            max={(() => {
              const dv = form.getFieldValue('device_type');
              const device = deviceList.find((d) => d.device_type === dv);
              return device?.available_count || device?.total_count || 1;
            })()}
            style={{ width: '100%' }}
            placeholder="选择设备数量"
          />
        </Form.Item>

        <Form.Item
          name="toolset_id"
          label={isOperatorTest ? '算子评测工具（必选）' : '模型部署测试工具（可选）'}
          rules={
            isOperatorTest
              ? [{ required: true, message: '算子测试必须选择评测工具' }]
              : []
          }
        >
          <Select
            placeholder={isOperatorTest ? '选择算子评测工具' : '选择模型部署测试工具'}
            allowClear={!isOperatorTest}
            loading={toolsetsLoading}
            options={(isOperatorTest ? operatorToolsets : modelToolsets).map((t) => ({ label: t.name, value: t.id }))}
            notFoundContent={isOperatorTest ? '暂无算子评测工具' : '暂无模型部署测试工具'}
          />
        </Form.Item>

        {isOperatorTest && (
          <>
            <Form.Item
              name="operator_lib_id"
              label="选择算子库"
              extra="选择算子的来源库，不同算子库实现可能影响测试结果"
              rules={[{ required: true, message: '算子测试必须选择算子库' }]}
            >
              <Select
                placeholder="选择算子库来源"
                loading={operatorLibsLoading}
                options={operatorLibs.map((lib) => ({
                  label: `${lib.name}${lib.description ? ` — ${lib.description.substring(0, 40)}...` : ''}`,
                  value: lib.id,
                }))}
              />
            </Form.Item>
          </>
        )}

        {!isOperatorTest && (
          <Form.Item
            name="image_id"
            label="选择部署镜像（芯片 + 框架 + 模型）"
            extra="选择要测试的芯片 + 框架 + 模型组合镜像，镜像已预置子场景标签"
            rules={[{ required: true, message: '模型部署测试必须选择镜像' }]}
          >
            <Select
              placeholder="选择模型部署镜像"
              loading={modelImagesLoading}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={modelImages.map((img) => ({
                label: `${img.name}${img.tags?.length ? ` (${img.tags.join(', ')})` : ''}`,
                value: img.id,
              }))}
              notFoundContent="暂无可用镜像"
            />
          </Form.Item>
        )}

            <Form.Item
              name="operator_categories"
              label="选择算子分类"
              extra="不选则测试所有分类的算子"
            >
              <Select
                mode="multiple"
                placeholder="选择要测试的算子分类（可多选，不选=全部）"
                allowClear
                options={operatorCategories.map((c) => ({
                  label: `${c.category} (${c.count}个)`,
                  value: c.category,
                }))}
                onChange={(vals: string[]) => {
                  // Update max operator count hint based on selected categories
                  if (vals && vals.length > 0) {
                    const matchedCount = operatorCategories
                      .filter((c) => vals.includes(c.category))
                      .reduce((sum, c) => sum + c.count, 0);
                    form.setFieldsValue({
                      _availableOpCount: matchedCount,
                    });
                  } else {
                    form.setFieldsValue({
                      _availableOpCount: totalOperatorCount,
                    });
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              name="operator_count"
              label="测试算子数量"
              extra={(() => {
                const selectedCats = form.getFieldValue('operator_categories');
                if (selectedCats && selectedCats.length > 0) {
                  const matchedCount = operatorCategories
                    .filter((c: OpCategoryInfo) => selectedCats.includes(c.category))
                    .reduce((sum: number, c: OpCategoryInfo) => sum + c.count, 0);
                  return `已选分类共 ${matchedCount} 个算子，不填则测试全部`;
                }
                return `共 ${totalOperatorCount} 个算子，不填则测试全部`;
              })()}
            >
              <InputNumber
                min={1}
                max={totalOperatorCount || 100}
                style={{ width: '100%' }}
                placeholder="不填则测试全部匹配算子"
              />
            </Form.Item>
          </>
        )}

        <Form.Item name="description" label="任务描述">
          <TextArea
            rows={3}
            placeholder="请输入任务描述（选填）"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="priority"
          label="任务优先级"
          rules={[{ required: true, message: '请选择优先级' }]}
        >
          <Radio.Group>
            <Radio.Button value="high">高</Radio.Button>
            <Radio.Button value="medium">中</Radio.Button>
            <Radio.Button value="low">低</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Form>
    </div>
  );

  const renderStep3 = () => {
    const values = { ...cachedFormValues, ...form.getFieldsValue() };
    const device = deviceList.find((d) => d.device_type === values.device_type);
    const allToolsets = [...operatorToolsets, ...modelToolsets];
    const toolset = allToolsets.find((t) => t.id === values.toolset_id);
    const priorityInfo = PRIORITY_MAP[values.priority];
    const deviceCount = values.device_count ?? 1;
    const exceedsAvailable = device ? deviceCount > device.available_count : false;

    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card style={{ borderRadius: 8 }}>
          <Descriptions
            column={1}
            bordered
            size="small"
            labelStyle={{ width: 120, fontWeight: 500 }}
          >
            <Descriptions.Item label="评测大类">
              <Tag color="blue">{getCategoryLabel(taskCategory)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="子场景">
              <Tag color="geekblue">{getSubTypeLabel(taskType)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="任务名称">{values.name}</Descriptions.Item>
            <Descriptions.Item label="设备类型">
              <span style={{ fontWeight: 500 }}>
                {device?.name || values.device_type || '-'}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="设备数量">
              {deviceCount} 台
              {device && (
                <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                  (空闲 {device.available_count} / 共 {device.total_count} 台)
                </span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={isOperatorTest ? '算子评测工具' : '模型部署测试工具'}>
              {toolset?.name || '未选择'}
            </Descriptions.Item>
            {taskCategory === 'operator_test' && (
              <>
                <Descriptions.Item label="算子库">
                  {(() => {
                    const lib = operatorLibs.find((l) => l.id === values.operator_lib_id);
                    return lib ? <Tag color="purple">{lib.name}</Tag> : <span style={{ color: '#999' }}>未选择</span>;
                  })()}
                </Descriptions.Item>
              </>
            )}
            {taskCategory === 'model_test' && (
              <Descriptions.Item label="部署镜像">
                {(() => {
                  const img = modelImages.find((m) => m.id === values.image_id);
                  return img ? (
                    <div>
                      <Tag color="cyan">{img.name}</Tag>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{img.description}</div>
                      {img.tags?.slice(0, 3).map((tag) => <Tag key={tag} style={{ marginTop: 4 }}>{tag}</Tag>)}
                    </div>
                  ) : <span style={{ color: '#999' }}>未选择</span>;
                })()}
              </Descriptions.Item>
            )}
                <Descriptions.Item label="算子分类">
                  {values.operator_categories && values.operator_categories.length > 0
                    ? values.operator_categories.map((c: string) => (
                        <Tag key={c} color="cyan" style={{ marginBottom: 4 }}>{c}</Tag>
                      ))
                    : <span style={{ color: '#999' }}>全部分类</span>
                  }
                </Descriptions.Item>
                <Descriptions.Item label="测试算子数量">
                  {values.operator_count
                    ? `${values.operator_count} 个`
                    : <span style={{ color: '#999' }}>全部匹配算子</span>
                  }
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="任务描述">
              {values.description || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="优先级">
              <Tag color={priorityInfo?.color}>
                {priorityInfo?.label || values.priority}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
          {exceedsAvailable && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 16 }}
              message="设备数量不足"
              description={`需要 ${deviceCount} 台 ${device?.name}，当前空闲仅 ${device?.available_count} 台。请减少设备数量或等待设备释放。`}
            />
          )}
        </Card>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (current) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHeader
        title="创建评测任务"
        breadcrumbs={[
          { title: '评测系统', path: '/evaluations/list' },
          { title: '创建任务' },
        ]}
      />
      <Card style={{ borderRadius: 8 }}>
        <Steps
          current={current}
          items={steps}
          style={{ marginBottom: 32, maxWidth: 700, margin: '0 auto 32px' }}
        />
        <div style={{ minHeight: 300 }}>{renderStepContent()}</div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 32,
            maxWidth: 700,
            margin: '32px auto 0',
          }}
        >
          {current > 0 ? (
            <Button onClick={handlePrev}>上一步</Button>
          ) : (
            <div />
          )}
          {current < steps.length - 1 && (
            <Button type="primary" onClick={handleNext}>
              下一步
            </Button>
          )}
          {current === steps.length - 1 && (
            <Button type="primary" loading={loading} onClick={handleSubmit}>
              提交任务
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

