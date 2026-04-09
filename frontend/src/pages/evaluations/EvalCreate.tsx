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
  Statistic,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { DefaultOptionType } from 'antd/es/select';
import PageHeader from '@/components/PageHeader';
import {
  EVAL_CATEGORIES,
  OPERATOR_TEST_TYPES,
  MODEL_TEST_TYPES,
  PRIORITY_MAP,
  TASK_TYPE_PREFIX_MAP,
} from '@/utils/constants';
import { createEvaluation } from '@/api/evaluations';
import { extractErrorMessage } from '@/utils/error';
import { getAssets } from '@/api/assets';
import { getResourceSummary } from '@/api/resources';
import { getBenchmarkCategories, getBenchmarkSummary } from '@/api/benchmark';
import { getAvailableImages, getAvailableToolsets } from '@/api/modelBenchmark';
import dayjs from 'dayjs';

const { TextArea } = Input;

type DeviceInfo = {
  device_type: string;
  name: string;
  manufacturer: string;
  total_count: number;
  available_count: number;
  status: string;
};

type ModelImageInfo = {
  id: number;
  name: string;
  description?: string;
  tags?: string[];
  chip_name?: string;
  model_name?: string;
  framework_name?: string;
  middleware_name?: string;
  scenario_tags?: string[];
};

type OpCategoryInfo = {
  category: string;
  count: number;
};

type VisualStageInfo = {
  key: string;
  title: string;
  subtitle: string;
  description?: string;
  meta?: string;
  disabled?: boolean;
  selected?: boolean;
  faded?: boolean;
  onClick?: () => void;
};

function normalizeText(value?: string) {
  return String(value || '').trim().toLowerCase();
}

const DEVICE_CHIP_TAG_MAP: Record<string, string> = {
  huawei_910c: '910C',
  huawei_910b: '910B',
  cambrian_590: 'MLU590',
  kunlun_p800: 'P800',
  hygon_bw1000: 'BW1000',
};

function chipLabelFromDevice(device?: DeviceInfo) {
  if (!device) return '';
  return device.name.replace(/（.*?）/g, '').trim();
}

function chipTagFromDevice(device?: DeviceInfo) {
  if (!device) return '';
  return DEVICE_CHIP_TAG_MAP[device.device_type] || '';
}

function chipKeyFromImage(image: ModelImageInfo) {
  const tags = image.tags || [];
  return normalizeText(image.chip_name || tags[0] || image.name.split('-')[0]);
}

function middlewareLabelFromImage(image: ModelImageInfo) {
  const tags = image.tags || [];
  return image.middleware_name || image.framework_name || tags[1] || '未知中间层';
}

function middlewareKeyFromImage(image: ModelImageInfo) {
  return normalizeText(middlewareLabelFromImage(image));
}

function scenarioTagsFromImage(image: ModelImageInfo, scenarioTagSet: Set<string>) {
  return (image.tags || []).filter((tag) => scenarioTagSet.has(tag));
}

function VisualStage({ title, hint, items }: { title: string; hint: string; items: VisualStageInfo[] }) {
  return (
    <Card
      size="small"
      style={{
        borderRadius: 18,
        background: 'linear-gradient(180deg, #fbfdff 0%, #f3f8ff 100%)',
        border: '1px solid #d9e6ff',
        boxShadow: '0 10px 24px rgba(27, 58, 107, 0.06)',
      }}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, color: '#102a4f', fontSize: 16 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#60738f', marginTop: 4 }}>{hint}</div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 6,
          scrollSnapType: 'x proximity',
        }}
      >
        {items.map((item) => (
          <div
            key={item.key}
            onClick={item.disabled ? undefined : item.onClick}
            style={{
              minWidth: 220,
              maxWidth: 220,
              flex: '0 0 220px',
              borderRadius: 16,
              padding: 14,
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              border: item.selected ? '2px solid #1b3a6b' : '1px solid #d7deeb',
              background: item.selected
                ? 'linear-gradient(180deg, #e8f0ff 0%, #f7fbff 100%)'
                : item.faded
                  ? 'linear-gradient(180deg, #f6f7f9 0%, #eef1f5 100%)'
                  : 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
              color: item.faded ? '#9aa7b8' : '#102a4f',
              opacity: item.disabled ? 0.45 : item.faded ? 0.7 : 1,
              boxShadow: item.selected
                ? '0 14px 30px rgba(27, 58, 107, 0.18)'
                : '0 8px 18px rgba(15, 34, 64, 0.06)',
              transition: 'all 0.2s ease',
              scrollSnapAlign: 'start',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.5 }}>{item.title}</div>
              {item.selected ? <Tag color="blue" style={{ marginInlineEnd: 0, borderRadius: 999 }}>已选</Tag> : null}
            </div>
            <div style={{ fontSize: 12, marginTop: 8, color: item.faded ? '#9aa7b8' : '#60738f', lineHeight: 1.6 }}>{item.subtitle}</div>
            {item.description ? (
              <div style={{ fontSize: 12, marginTop: 10, color: item.faded ? '#a8b2be' : '#50627d', lineHeight: 1.7 }}>{item.description}</div>
            ) : null}
            {item.meta ? <div style={{ marginTop: 10, fontSize: 11, color: item.faded ? '#a8b2be' : '#7b8aa0' }}>{item.meta}</div> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function EvalCreate() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const [taskCategory, setTaskCategory] = useState<string>('');
  const [taskType, setTaskType] = useState<string>('');
  const [typeSearch, setTypeSearch] = useState('');

  const [operatorToolsets, setOperatorToolsets] = useState<{ id: number; name: string }[]>([]);
  const [modelToolsets, setModelToolsets] = useState<{ id: number; name: string }[]>([]);
  const [toolsetsLoading, setToolsetsLoading] = useState(false);
  const [operatorLibs, setOperatorLibs] = useState<{ id: number; name: string; description?: string }[]>([]);
  const [operatorLibsLoading, setOperatorLibsLoading] = useState(false);
  const [modelImages, setModelImages] = useState<ModelImageInfo[]>([]);
  const [allModelImages, setAllModelImages] = useState<ModelImageInfo[]>([]);
  const [modelImagesLoading, setModelImagesLoading] = useState(false);
  const [cachedFormValues, setCachedFormValues] = useState<any>({});
  const [deviceList, setDeviceList] = useState<DeviceInfo[]>([]);
  const [operatorCategories, setOperatorCategories] = useState<OpCategoryInfo[]>([]);
  const [totalOperatorCount, setTotalOperatorCount] = useState<number>(0);
  const [visualFramework, setVisualFramework] = useState<string>('');

  const fetchOperatorCategories = useCallback(async () => {
    try {
      const res: any = await getBenchmarkCategories();
      const list = res?.data || res;
      if (Array.isArray(list)) setOperatorCategories(list);
      const summaryRes: any = await getBenchmarkSummary();
      const summaryData = summaryRes?.data || summaryRes;
      if (summaryData?.total_operators) setTotalOperatorCount(summaryData.total_operators);
    } catch {}
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const res: any = await getResourceSummary();
      const data = res?.data || res;
      const devices = data?.devices_by_type || data?.devices || [];
      if (Array.isArray(devices)) setDeviceList(devices);
    } catch {}
  }, []);

  const fetchToolsets = (scenarioType?: string) => {
    setToolsetsLoading(true);
    if (scenarioType && taskCategory === 'model_deployment_test') {
      getAvailableToolsets(scenarioType)
        .then((res: any) => {
          const list = res?.data || res || [];
          if (Array.isArray(list)) setModelToolsets(list.map((item: any) => ({ id: item.id, name: item.name })));
        })
        .catch(() => {})
        .finally(() => setToolsetsLoading(false));
    } else {
      getAssets({ asset_type: 'toolset', page_size: 100 })
        .then((res: any) => {
          const list = res?.data?.items || res?.items || res?.data || [];
          if (Array.isArray(list)) {
            const opTools: { id: number; name: string }[] = [];
            const modelTools: { id: number; name: string }[] = [];
            list.forEach((item: any) => {
              if (item.category === '算子测试工具') opTools.push({ id: item.id, name: item.name });
              else if (item.category === '模型部署测试工具') modelTools.push({ id: item.id, name: item.name });
              else {
                opTools.push({ id: item.id, name: item.name });
                modelTools.push({ id: item.id, name: item.name });
              }
            });
            setOperatorToolsets(opTools);
            setModelToolsets(modelTools);
          }
        })
        .catch(() => {})
        .finally(() => setToolsetsLoading(false));
    }
  };

  const fetchOperatorLibs = () => {
    setOperatorLibsLoading(true);
    getAssets({ asset_type: 'operator', category: '算子库', page_size: 100 })
      .then((res: any) => {
        const list = res?.data?.items || res?.items || res?.data || [];
        if (Array.isArray(list)) {
          setOperatorLibs(list.map((item: any) => ({ id: item.id, name: item.name, description: item.description })));
        }
      })
      .catch(() => {})
      .finally(() => setOperatorLibsLoading(false));
  };

  const fetchModelImages = (scenarioType?: string, deviceType?: string) => {
    setModelImagesLoading(true);
    getAvailableImages(scenarioType, deviceType)
      .then((res: any) => {
        const list = res?.data || res || [];
        if (Array.isArray(list)) {
          const mapped = list.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            tags: item.tags,
            chip_name: item.chip_name,
            framework_name: item.framework_name,
            middleware_name: item.middleware_name,
            model_name: item.model_name,
            scenario_tags: item.scenario_tags,
          }));
          setModelImages(mapped);
        }
      })
      .catch(() => setModelImages([]))
      .finally(() => setModelImagesLoading(false));
  };

  const fetchAllModelImages = useCallback(async () => {
    try {
      const allItems: any[] = [];
      let page = 1;
      const pageSize = 100;
      let total = Number.POSITIVE_INFINITY;
      while (allItems.length < total) {
        const res: any = await getAssets({ asset_type: 'image', page, page_size: pageSize });
        const payload = res?.data?.data || res?.data || res || {};
        const items = Array.isArray(payload?.items) ? payload.items : [];
        total = Number(payload?.total ?? items.length);
        allItems.push(...items);
        if (items.length === 0 || items.length < pageSize) break;
        page += 1;
      }
      setAllModelImages(
        allItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          tags: Array.isArray(item.tags)
            ? item.tags
            : typeof item.tags === 'string'
              ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
              : [],
          chip_name: item.chip_name,
          framework_name: item.framework_name,
          middleware_name: item.middleware_name,
          model_name: item.model_name,
          scenario_tags: item.scenario_tags,
        })),
      );
    } catch {
      setAllModelImages([]);
    }
  }, []);

  useEffect(() => {
    fetchOperatorLibs();
    fetchDevices();
    fetchOperatorCategories();
    fetchAllModelImages();
  }, [fetchOperatorCategories, fetchDevices, fetchAllModelImages]);

  useEffect(() => {
    if (taskCategory === 'model_deployment_test' && taskType) {
      fetchToolsets(taskType);
    } else if (taskCategory === 'operator_test') {
      fetchToolsets();
    }
  }, [taskCategory, taskType]);

  const steps = [
    { title: '选择评测大类' },
    { title: '选择子类型' },
    { title: '配置测试参数' },
    { title: '确认提交' },
  ];

  const subTypes = useMemo(() => {
    if (taskCategory === 'operator_test') return OPERATOR_TEST_TYPES;
    if (taskCategory === 'model_deployment_test') return MODEL_TEST_TYPES;
    return [];
  }, [taskCategory]);

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

  const generateDefaultName = (deviceVal?: string) => {
    const subType = subTypes.find((t) => t.value === taskType);
    const today = dayjs().format('YYYYMMDD');
    const device = deviceList.find((d) => d.device_type === deviceVal);
    const shortDevice = device ? device.name.split(' ')[0] : '设备';
    return `${subType?.label || '评测'}-${shortDevice}-${today}`;
  };

  const handleNext = async () => {
    if (current === 0) {
      if (!taskCategory) return message.warning('请选择评测大类');
      setCurrent(1);
      return;
    }
    if (current === 1) {
      if (!taskType) return message.warning('请选择子类型');
      const subType = subTypes.find((t) => t.value === taskType);
      const today = dayjs().format('YYYYMMDD');
      const defaults: any = { name: `${subType?.label || '评测'}-${today}`, priority: 'medium' };
      if (isOperatorTest) {
        const defaultToolset = operatorToolsets.find((t) => t.name === 'Deeplink_op_test' || t.name.includes('Deeplink_op_test'));
        if (defaultToolset) defaults.toolset_id = defaultToolset.id;
      }
      form.setFieldsValue(defaults);
      setCurrent(2);
      return;
    }
    if (current === 2) {
      try {
        await form.validateFields();
        if (isOperatorTest && !form.getFieldValue('toolset_id')) return message.warning('算子测试必须选择工具集');
        setCachedFormValues(form.getFieldsValue());
        setCurrent(3);
      } catch {}
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
    await fetchDevices();
    const formValues = form.getFieldsValue();
    const values = { ...cachedFormValues, ...formValues };
    const deviceCount = values.device_count ?? 1;
    const device = deviceList.find((d) => d.device_type === values.device_type);
    if (device && deviceCount > device.available_count) {
      message.error(`设备数量不足：需要 ${deviceCount} 台 ${device.name}，当前空闲仅 ${device.available_count} 台`);
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        name: values.name,
        description: values.description || undefined,
        task_category: taskCategory as 'operator_test' | 'model_deployment_test',
        task_type: taskType,
        device_type: values.device_type,
        device_count: deviceCount,
        visibility: values.visibility || 'private',
        toolset_id: values.toolset_id,
        priority: values.priority,
      };
      if (taskCategory === 'operator_test') {
        if (values.operator_count) params.operator_count = values.operator_count;
        if (values.operator_categories?.length) params.operator_categories = values.operator_categories;
        if (values.operator_lib_id) params.operator_lib_id = values.operator_lib_id;
      }
      if (taskCategory === 'model_deployment_test' && values.image_id) params.image_id = values.image_id;
      const res: any = await createEvaluation(params);
      message.success('评测任务创建成功！');
      const newId = res?.data?.id || res?.id;
      navigate(newId ? `/evaluations/${newId}` : '/evaluations/list');
    } catch (error) {
      message.error(extractErrorMessage(error, '创建任务失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (val: string) => EVAL_CATEGORIES.find((c) => c.value === val)?.label || val;
  const getSubTypeLabel = (val: string) => subTypes.find((t) => t.value === val)?.label || val;
  const scenarioTagSet = useMemo(() => new Set(subTypes.map((t) => t.value)), [subTypes]);

  const onlineDevices = useMemo(() => deviceList.filter((d) => d.status === 'online'), [deviceList]);
  const selectedDeviceType = Form.useWatch('device_type', form);
  const selectedImageId = Form.useWatch('image_id', form);

  const visualCandidateImages = useMemo(() => {
    if (!taskType) return [];
    return allModelImages.filter((img) => scenarioTagsFromImage(img, scenarioTagSet).includes(taskType));
  }, [allModelImages, scenarioTagSet, taskType]);

  const deviceCandidates = useMemo(() => {
    if (taskCategory !== 'model_deployment_test') return [] as DeviceInfo[];
    if (!taskType) return onlineDevices;
    const chips = new Set(visualCandidateImages.map((img) => chipKeyFromImage(img)));
    const matched = onlineDevices.filter((device) => chips.has(normalizeText(chipTagFromDevice(device))));
    return matched.length ? matched : onlineDevices;
  }, [onlineDevices, taskCategory, taskType, visualCandidateImages]);

  const selectedDevice = useMemo(() => deviceList.find((d) => d.device_type === selectedDeviceType), [deviceList, selectedDeviceType]);
  const selectedDeviceChipKey = useMemo(() => normalizeText(chipTagFromDevice(selectedDevice)), [selectedDevice]);

  const frameworkCandidates = useMemo(() => {
    if (taskCategory !== 'model_deployment_test' || !taskType || !selectedDeviceChipKey) return [] as { key: string; label: string; count: number; descriptions: string[] }[];
    const bucket = new Map<string, { key: string; label: string; count: number; descriptions: string[] }>();
    visualCandidateImages
      .filter((img) => chipKeyFromImage(img) === selectedDeviceChipKey)
      .forEach((img) => {
        const key = middlewareKeyFromImage(img);
        const label = middlewareLabelFromImage(img);
        const prev = bucket.get(key) || { key, label, count: 0, descriptions: [] };
        prev.count += 1;
        if (img.description) prev.descriptions.push(img.description);
        bucket.set(key, prev);
      });
    return Array.from(bucket.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [selectedDeviceChipKey, taskCategory, taskType, visualCandidateImages]);

  useEffect(() => {
    if (taskCategory !== 'model_deployment_test') return;
    if (!selectedDeviceType) {
      setVisualFramework('');
      form.setFieldsValue({ image_id: undefined });
      return;
    }
    if (!frameworkCandidates.some((item) => item.key === visualFramework)) {
      const first = frameworkCandidates[0]?.key || '';
      setVisualFramework(first);
      form.setFieldsValue({ image_id: undefined });
    }
  }, [frameworkCandidates, form, selectedDeviceType, taskCategory, visualFramework]);

  const imageCandidatesByVisual = useMemo(() => {
    if (taskCategory !== 'model_deployment_test' || !taskType || !selectedDeviceChipKey || !visualFramework) return [] as ModelImageInfo[];
    return visualCandidateImages.filter((img) => chipKeyFromImage(img) === selectedDeviceChipKey && middlewareKeyFromImage(img) === visualFramework);
  }, [selectedDeviceChipKey, taskCategory, taskType, visualCandidateImages, visualFramework]);

  useEffect(() => {
    if (taskCategory === 'model_deployment_test' && taskType && selectedDeviceType) {
      fetchModelImages(taskType, selectedDeviceType);
    }
  }, [selectedDeviceType, taskCategory, taskType]);

  useEffect(() => {
    if (taskCategory !== 'model_deployment_test') return;
    const currentImageId = form.getFieldValue('image_id');
    if (currentImageId && !imageCandidatesByVisual.some((img) => img.id === currentImageId)) {
      form.setFieldsValue({ image_id: undefined });
    }
  }, [form, imageCandidatesByVisual, taskCategory]);

  const modelVisualSummary = useMemo(() => ({
    deviceCount: deviceCandidates.length,
    frameworkCount: frameworkCandidates.length,
    imageCount: imageCandidatesByVisual.length,
  }), [deviceCandidates.length, frameworkCandidates.length, imageCandidatesByVisual.length]);

  const renderStep0 = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24, color: '#666' }}>选择评测类型</div>
      <Row gutter={24} justify="center">
        {EVAL_CATEGORIES.map((cat) => {
          const isActive = taskCategory === cat.value;
          return (
            <Col key={cat.value} xs={24} sm={12} md={10}>
              <Card hoverable onClick={() => setTaskCategory(cat.value)} style={{ textAlign: 'center', borderRadius: 18, border: isActive ? '3px solid #1B3A6B' : '2px solid #cfd8ea', background: isActive ? 'linear-gradient(180deg, #e8f0ff 0%, #f7faff 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%)', boxShadow: isActive ? '0 18px 38px rgba(27, 58, 107, 0.22)' : '0 10px 24px rgba(27, 58, 107, 0.08)', cursor: 'pointer', marginBottom: 16, transform: isActive ? 'translateY(-4px) scale(1.01)' : 'translateY(0)', transition: 'all 0.2s ease', overflow: 'hidden', position: 'relative' }} styles={{ body: { padding: '40px 24px' } }}>
                {isActive ? <div style={{ position: 'absolute', top: 14, right: 14 }}><Tag color="blue" style={{ borderRadius: 999, paddingInline: 10, fontWeight: 700 }}>已选中</Tag></div> : null}
                <div style={{ fontSize: 56, marginBottom: 16, filter: isActive ? 'drop-shadow(0 6px 12px rgba(27,58,107,0.18))' : 'none' }}>{cat.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#102a4f', marginBottom: 10 }}>{cat.label}</div>
                <div style={{ color: '#50627d', fontSize: 14, lineHeight: 1.7 }}>{cat.value === 'operator_test' ? '适用于算子精度验证、性能测试与算子库适配分析' : '适用于模型部署验证、镜像能力评估与综合指标测试'}</div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16, color: '#666' }}>当前大类：<Tag color="blue">{getCategoryLabel(taskCategory)}</Tag></div>
      {taskCategory === 'model_deployment_test' && <div style={{ maxWidth: 400, margin: '0 auto 20px' }}><Input prefix={<SearchOutlined />} placeholder="搜索子场景..." allowClear value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} /></div>}
      <Row gutter={[16, 16]} justify={isOperatorTest ? 'center' : 'start'}>
        {filteredSubTypes.map((st) => {
          const isActive = taskType === st.value;
          return (
            <Col key={st.value} xs={24} sm={12} md={isOperatorTest ? 10 : 6}>
              <Card hoverable size="small" onClick={() => setTaskType(st.value)} style={{ borderRadius: 16, border: isActive ? '3px solid #1B3A6B' : '1px solid #d7deeb', background: isActive ? 'linear-gradient(180deg, #eaf2ff 0%, #f8fbff 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%)', cursor: 'pointer', height: '100%', boxShadow: isActive ? '0 16px 34px rgba(27, 58, 107, 0.18)' : '0 8px 18px rgba(15, 34, 64, 0.06)', transform: isActive ? 'translateY(-3px)' : 'translateY(0)', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden' }} styles={{ body: { padding: '18px 16px' } }}>
                {isActive ? <div style={{ position: 'absolute', top: 12, right: 12 }}><Tag color="blue" style={{ borderRadius: 999, paddingInline: 8, fontWeight: 700 }}>已选中</Tag></div> : null}
                <div style={{ fontWeight: 700, fontSize: 15, color: '#102a4f', marginBottom: 8, paddingRight: 70 }}>{st.label}</div>
                <div style={{ color: '#60738f', fontSize: 12, lineHeight: 1.7 }}>{st.description}</div>
              </Card>
            </Col>
          );
        })}
      </Row>
      {filteredSubTypes.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>没有匹配的子场景</div>}
    </div>
  );

  const selectFieldStyle = { borderRadius: 12, border: '1px solid #cfd8ea', boxShadow: '0 6px 18px rgba(16, 42, 79, 0.06)' } as const;

  const renderVisualModelSelector = () => {
    if (taskCategory !== 'model_deployment_test') return null;

    const deviceItems: VisualStageInfo[] = deviceCandidates.map((device) => {
      const selected = device.device_type === selectedDeviceType;
      const chipKey = normalizeText(chipLabelFromDevice(device));
      const availableImagesForDevice = visualCandidateImages.filter((img) => chipKeyFromImage(img) === chipKey).length;
      return {
        key: device.device_type,
        title: chipLabelFromDevice(device),
        subtitle: `${device.manufacturer || '设备'} · 空闲 ${device.available_count} / 共 ${device.total_count}`,
        description: availableImagesForDevice > 0 ? `当前子场景下有 ${availableImagesForDevice} 个镜像候选` : '当前子场景下暂无镜像候选',
        meta: availableImagesForDevice > 3 ? '左右拖拽可查看更多设备候选' : undefined,
        selected,
        faded: !selected && Boolean(selectedDeviceType),
        disabled: device.available_count === 0,
        onClick: () => {
          form.setFieldsValue({
            device_type: device.device_type,
            device_count: 1,
            name: generateDefaultName(device.device_type),
            image_id: undefined,
          });
        },
      };
    });

    const frameworkItems: VisualStageInfo[] = frameworkCandidates.map((item) => ({
      key: item.key,
      title: item.label,
      subtitle: `${item.count} 个镜像候选`,
      description: selectedDevice ? `基于 ${chipLabelFromDevice(selectedDevice)} 过滤` : '请先选择设备',
      meta: item.count > 3 ? '左右拖拽可查看更多框架' : undefined,
      selected: item.key === visualFramework,
      faded: Boolean(visualFramework) && item.key !== visualFramework,
      disabled: !selectedDeviceType,
      onClick: () => {
        setVisualFramework(item.key);
        form.setFieldsValue({ image_id: undefined });
      },
    }));

    const imageItems: VisualStageInfo[] = imageCandidatesByVisual.map((img) => ({
      key: String(img.id),
      title: img.model_name || img.name,
      subtitle: `${middlewareLabelFromImage(img)} · ${img.chip_name || chipLabelFromDevice(selectedDevice) || '未知芯片'}`,
      description: img.description || img.name,
      meta: (img.tags || []).filter((tag) => scenarioTagSet.has(tag)).map((tag) => getSubTypeLabel(tag)).join(' / ') || undefined,
      selected: img.id === selectedImageId,
      faded: Boolean(selectedImageId) && img.id !== selectedImageId,
      disabled: !visualFramework,
      onClick: () => form.setFieldsValue({ image_id: img.id }),
    }));

    return (
      <div style={{ marginBottom: 24 }}>
        <Card style={{ borderRadius: 18, marginBottom: 16, background: 'linear-gradient(180deg, #ffffff 0%, #f6faff 100%)', border: '1px solid #d7e6ff', boxShadow: '0 12px 28px rgba(27, 58, 107, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#102a4f' }}>模型部署评测图形化选择</div>
              <div style={{ marginTop: 6, fontSize: 13, color: '#60738f', lineHeight: 1.7 }}>
                按照 <b>设备 → 中间层 → 镜像</b> 三层逐步筛选。每层默认以卡片方式横向展示，灰色卡片表示当前未选中的周边候选，可左右拖拽查看更多。
              </div>
            </div>
            <Space wrap>
              <Tag color="blue">设备 {modelVisualSummary.deviceCount}</Tag>
              <Tag color="purple">中间层 {modelVisualSummary.frameworkCount}</Tag>
              <Tag color="cyan">镜像 {modelVisualSummary.imageCount}</Tag>
            </Space>
          </div>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <VisualStage title="第一层：设备" hint="先选芯片设备；已选设备会高亮，其他可用设备以灰色卡片显示。" items={deviceItems} />
            <VisualStage title="第二层：中间层" hint={selectedDeviceType ? '根据所选设备与子场景，展示可用的中间层；逻辑与镜像 tags 第二位保持一致。' : '先在第一层选择设备后，这里会显示匹配的中间层。'} items={frameworkItems.length ? frameworkItems : [{ key: 'empty-framework', title: '暂无中间层候选', subtitle: selectedDeviceType ? '当前设备下没有匹配中间层' : '请先选择设备', disabled: true }]} />
            <VisualStage title="第三层：镜像选择" hint={visualFramework ? '根据前两层结果，展示最终可选镜像。' : '先完成前两层选择后，这里会显示镜像候选。'} items={imageItems.length ? imageItems : [{ key: 'empty-image', title: '暂无镜像候选', subtitle: visualFramework ? '当前条件下没有匹配镜像' : '请先选择中间层', disabled: true }]} />
          </Space>
        </Card>
      </div>
    );
  };

  const currentRoutePrefix = taskType ? TASK_TYPE_PREFIX_MAP[taskType] : undefined;

  const renderStep2 = () => (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Card
        style={{
          borderRadius: 18,
          marginBottom: 20,
          background: 'linear-gradient(135deg, rgba(24, 76, 167, 0.08), rgba(79, 216, 255, 0.08))',
          border: '1px solid rgba(47, 124, 246, 0.14)',
          boxShadow: '0 12px 28px rgba(27, 58, 107, 0.08)',
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Statistic title="当前大类" value={getCategoryLabel(taskCategory) || '-'} valueStyle={{ color: '#102a4f', fontWeight: 800, fontSize: 22 }} />
          </Col>
          <Col xs={24} md={8}>
            <Statistic title="当前子场景" value={getSubTypeLabel(taskType) || '-'} valueStyle={{ color: '#102a4f', fontWeight: 800, fontSize: 22 }} />
          </Col>
          <Col xs={24} md={8}>
            <Statistic title="编号前缀" value={currentRoutePrefix || '--'} valueStyle={{ color: '#102a4f', fontWeight: 800, fontSize: 22 }} suffix={currentRoutePrefix ? '系列' : ''} />
          </Col>
        </Row>
        <div style={{ marginTop: 12, fontSize: 13, color: '#60738f', lineHeight: 1.8 }}>
          提交页和 DL 智能体页现在遵循同一套路由语义：<b>taskType</b> 决定编号前缀，<b>deviceType</b> 只表示芯片环境，镜像与工具应对齐到同一前缀段。
        </div>
      </Card>
      <Form form={form} layout="vertical" preserve={true}>
        <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}><Input placeholder="请输入任务名称" /></Form.Item>

        {!isOperatorTest ? renderVisualModelSelector() : null}

        <Form.Item name="device_type" label="选择设备类型" rules={[{ required: true, message: '请选择设备类型' }]}>
          <Select
            placeholder="选择智算设备"
            style={selectFieldStyle}
            onChange={(deviceType) => {
              form.setFieldsValue({ device_count: 1, name: generateDefaultName(deviceType), image_id: undefined });
            }}
            options={deviceList.filter((d) => d.status === 'online').map((d) => ({ label: `${d.name} (空闲 ${d.available_count} / 共 ${d.total_count} 台)`, value: d.device_type, disabled: d.available_count === 0 }))}
          />
        </Form.Item>

        <Form.Item name="device_count" label="设备数量" rules={[{ required: true, message: '请输入设备数量' }]} extra={(() => {
          const dv = form.getFieldValue('device_type');
          const device = deviceList.find((d) => d.device_type === dv);
          return device ? `当前 ${device.name} 空闲 ${device.available_count} 台，共 ${device.total_count} 台` : undefined;
        })()}>
          <InputNumber min={1} max={(() => {
            const dv = form.getFieldValue('device_type');
            const device = deviceList.find((d) => d.device_type === dv);
            return device?.available_count || device?.total_count || 1;
          })()} style={{ width: '100%', ...selectFieldStyle }} placeholder="选择设备数量" />
        </Form.Item>

        <Form.Item name="toolset_id" label={isOperatorTest ? '算子评测工具' : '模型部署测试工具'} rules={isOperatorTest ? [{ required: true, message: '算子测试必须选择评测工具' }] : []}>
          <Select placeholder={isOperatorTest ? '选择算子评测工具' : '选择模型部署测试工具'} allowClear={!isOperatorTest} loading={toolsetsLoading} style={selectFieldStyle} options={(isOperatorTest ? operatorToolsets : modelToolsets).map((t) => ({ label: t.name, value: t.id }))} notFoundContent={isOperatorTest ? '暂无算子评测工具' : '暂无模型部署测试工具'} />
        </Form.Item>

        {isOperatorTest && (
          <Form.Item name="operator_lib_id" label="选择算子库" extra="选择算子的来源库，不同算子库实现可能影响测试结果" rules={[{ required: true, message: '算子测试必须选择算子库' }]}>
            <Select placeholder="选择算子库来源" loading={operatorLibsLoading} style={selectFieldStyle} options={operatorLibs.map((lib) => ({ label: `${lib.name}${lib.description ? ` — ${lib.description.substring(0, 40)}...` : ''}`, value: lib.id }))} />
          </Form.Item>
        )}

        {!isOperatorTest && (
          <Form.Item
            name="image_id"
            label="选择部署镜像（芯片 + 框架 + 模型）"
            extra={<div style={{ fontSize: 12, color: taskType && form.getFieldValue('device_type') ? '#0f7a55' : '#8a5a00', background: taskType && form.getFieldValue('device_type') ? '#edf9f3' : '#fff7e8', border: `1px solid ${taskType && form.getFieldValue('device_type') ? '#b7ebc6' : '#ffd591'}`, borderRadius: 10, padding: '8px 10px' }}>{taskType && form.getFieldValue('device_type') ? <span>✅ 已根据设备类型与图形化层级选择匹配可用镜像</span> : <span>⚠️ 请先选择设备类型和子场景，系统将自动匹配可用镜像</span>}</div>}
            rules={[{ required: true, message: '模型部署测试必须选择镜像' }]}
          >
            <Select
              placeholder={!form.getFieldValue('device_type') ? '请先选择设备类型' : imageCandidatesByVisual.length === 0 ? '没有匹配的镜像（请检查芯片/中间层/子场景）' : '选择模型部署镜像'}
              loading={modelImagesLoading}
              showSearch
              style={selectFieldStyle}
              disabled={!form.getFieldValue('device_type')}
              filterOption={(input, option) => String(option?.searchText ?? option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={imageCandidatesByVisual.map((img) => {
                const scenarioTags = (img.tags || []).filter((tag) => scenarioTagSet.has(tag));
                return {
                  label: `${img.name} - ${img.model_name || '模型'} (${middlewareLabelFromImage(img)})`,
                  value: img.id,
                  searchText: `${img.name} ${img.model_name || ''} ${middlewareLabelFromImage(img)} ${scenarioTags.join(' ')}`,
                  chip_name: img.chip_name,
                  model_name: img.model_name,
                  framework_name: img.framework_name,
                  middleware_name: middlewareLabelFromImage(img),
                  scenarioTags,
                };
              })}
              optionRender={(option) => {
                const data = option.data as DefaultOptionType & { chip_name?: string; model_name?: string; framework_name?: string; middleware_name?: string; scenarioTags?: string[] };
                return (
                  <div style={{ padding: '4px 0' }}>
                    <div style={{ fontWeight: 600, color: '#102a4f', marginBottom: 4 }}>{String(data.label)}</div>
                    <div style={{ fontSize: 12, color: '#60738f', marginBottom: data.scenarioTags?.length ? 6 : 0 }}>{data.chip_name || '芯片'} · {data.middleware_name || data.framework_name || '中间层'} · {data.model_name || '模型'}</div>
                    {data.scenarioTags?.length ? <Space size={[4, 4]} wrap>{data.scenarioTags.map((tag) => <Tag key={tag} color={tag === taskType ? 'blue' : 'default'} style={{ marginInlineEnd: 0 }}>{getSubTypeLabel(tag)}</Tag>)}</Space> : null}
                  </div>
                );
              }}
              notFoundContent={modelImagesLoading ? '加载中...' : !form.getFieldValue('device_type') ? '请先选择设备类型' : '没有匹配的镜像，请检查芯片 / 中间层 / 子场景 tag 是否一致'}
            />
          </Form.Item>
        )}

        {isOperatorTest && (
          <>
            <Form.Item name="operator_categories" label="选择算子分类" extra="不选则测试所有分类的算子">
              <Select mode="multiple" placeholder="选择要测试的算子分类（可多选，不选=全部）" allowClear style={selectFieldStyle} options={operatorCategories.map((c) => ({ label: `${c.category} (${c.count}个)`, value: c.category }))} onChange={(vals: string[]) => {
                if (vals?.length) {
                  const matchedCount = operatorCategories.filter((c) => vals.includes(c.category)).reduce((sum, c) => sum + c.count, 0);
                  form.setFieldsValue({ _availableOpCount: matchedCount });
                } else {
                  form.setFieldsValue({ _availableOpCount: totalOperatorCount });
                }
              }} />
            </Form.Item>

            <Form.Item name="operator_count" label="测试算子数量" extra={(() => {
              const selectedCats = form.getFieldValue('operator_categories');
              if (selectedCats?.length) {
                const matchedCount = operatorCategories.filter((c) => selectedCats.includes(c.category)).reduce((sum, c) => sum + c.count, 0);
                return `已选分类共 ${matchedCount} 个算子，留空时默认全部纳入测试`;
              }
              return `当前共 ${totalOperatorCount} 个算子，留空时默认全部纳入测试`;
            })()}>
              <InputNumber min={1} max={totalOperatorCount || 100} style={{ width: '100%', ...selectFieldStyle }} placeholder="留空时默认测试全部匹配算子" />
            </Form.Item>
          </>
        )}

        <Form.Item name="description" label="任务描述"><TextArea rows={3} placeholder="请输入任务描述（选填）" maxLength={500} showCount /></Form.Item>
        <Form.Item name="priority" label="任务优先级" rules={[{ required: true, message: '请选择优先级' }]}><Radio.Group><Radio.Button value="high">高</Radio.Button><Radio.Button value="medium">中</Radio.Button><Radio.Button value="low">低</Radio.Button></Radio.Group></Form.Item>
        <Form.Item name="visibility" label="任务可见性" initialValue="private" rules={[{ required: true, message: '请选择任务可见性' }]}><Radio.Group><Radio.Button value="private">私有</Radio.Button><Radio.Button value="platform">全平台</Radio.Button></Radio.Group></Form.Item>
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
          <Descriptions column={1} bordered size="small" labelStyle={{ width: 120, fontWeight: 500 }}>
            <Descriptions.Item label="评测大类"><Tag color="blue">{getCategoryLabel(taskCategory)}</Tag></Descriptions.Item>
            <Descriptions.Item label="子场景"><Tag color="geekblue">{getSubTypeLabel(taskType)}</Tag></Descriptions.Item>
            <Descriptions.Item label="任务名称">{values.name}</Descriptions.Item>
            <Descriptions.Item label="设备类型"><span style={{ fontWeight: 500 }}>{device?.name || values.device_type || '-'}</span></Descriptions.Item>
            <Descriptions.Item label="设备数量">{deviceCount} 台{device && <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>(空闲 {device.available_count} / 共 {device.total_count} 台)</span>}</Descriptions.Item>
            <Descriptions.Item label={isOperatorTest ? '算子评测工具' : '模型部署测试工具'}>{toolset?.name || '未选择'}</Descriptions.Item>
            {taskCategory === 'operator_test' && <Descriptions.Item label="算子库">{(() => {
              const lib = operatorLibs.find((l) => l.id === values.operator_lib_id);
              return lib ? <Tag color="purple">{lib.name}</Tag> : <span style={{ color: '#999' }}>未选择</span>;
            })()}</Descriptions.Item>}
            {taskCategory === 'model_deployment_test' && <Descriptions.Item label="部署镜像">{(() => {
              const img = allModelImages.find((m) => m.id === values.image_id) || modelImages.find((m) => m.id === values.image_id);
              return img ? <div><Tag color="cyan">{img.name}</Tag><div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{img.description}</div>{img.tags?.slice(0, 3).map((tag) => <Tag key={tag} style={{ marginTop: 4 }}>{tag}</Tag>)}</div> : <span style={{ color: '#999' }}>未选择</span>;
            })()}</Descriptions.Item>}
            {taskCategory === 'operator_test' && <>
              <Descriptions.Item label="算子分类">{values.operator_categories?.length ? values.operator_categories.map((c: string) => <Tag key={c} color="cyan" style={{ marginBottom: 4 }}>{c}</Tag>) : <span style={{ color: '#999' }}>全部分类</span>}</Descriptions.Item>
              <Descriptions.Item label="测试算子数量">{values.operator_count ? `${values.operator_count} 个` : <span style={{ color: '#999' }}>全部匹配算子</span>}</Descriptions.Item>
            </>}
            <Descriptions.Item label="任务描述">{values.description || '无'}</Descriptions.Item>
            <Descriptions.Item label="优先级"><Tag color={priorityInfo?.color}>{priorityInfo?.label || values.priority}</Tag></Descriptions.Item>
            <Descriptions.Item label="任务可见性"><Tag color={values.visibility === 'platform' ? 'blue' : 'default'}>{values.visibility === 'platform' ? '全平台' : '私有'}</Tag></Descriptions.Item>
          </Descriptions>
          {exceedsAvailable && <Alert type="error" showIcon style={{ marginTop: 16 }} message="设备数量不足" description={`需要 ${deviceCount} 台 ${device?.name}，当前空闲仅 ${device?.available_count} 台。请减少设备数量或等待设备释放。`} />}
        </Card>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (current) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  return (
    <div>
      <PageHeader
        title="创建评测任务"
        subtitle="以统一路由语义创建正式评测：先选大类与子场景，再配置设备、工具与镜像，最后完成确认提交。"
        breadcrumbs={[{ title: '评测系统', path: '/evaluations/list' }, { title: '创建任务' }]}
        extra={<Space wrap><Tag color="blue">统一执行字段</Tag><Tag color="purple">图形化筛选</Tag><Tag color="cyan">编号前缀对齐</Tag></Space>}
      />
      <Card style={{ borderRadius: 18, boxShadow: '0 12px 28px rgba(27, 58, 107, 0.08)' }}>
        <Steps current={current} items={steps} style={{ marginBottom: 32, maxWidth: 760, margin: '0 auto 32px' }} />
        <div style={{ minHeight: 300 }}>{renderStepContent()}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, maxWidth: 700, margin: '32px auto 0' }}>
          {current > 0 ? <Button onClick={handlePrev}>上一步</Button> : <div />}
          {current < steps.length - 1 && <Button type="primary" onClick={handleNext}>下一步</Button>}
          {current === steps.length - 1 && <Button type="primary" loading={loading} onClick={handleSubmit}>提交任务</Button>}
        </div>
      </Card>
    </div>
  );
}
