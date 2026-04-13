import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Space, Tag, Typography, message } from 'antd';
import { CheckCircleOutlined, PartitionOutlined, RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { getAssets } from '@/api/assets';
import { createAdaptation } from '@/api/adaptation';
import { getBenchmarkCategories } from '@/api/benchmark';
import { createEvaluation } from '@/api/evaluations';
import { getAvailableToolsets } from '@/api/modelBenchmark';
import { getResourceSummary } from '@/api/resources';
import { MODEL_TEST_TYPES, OPERATOR_TEST_TYPES, TASK_TYPE_PREFIX_MAP } from '@/utils/constants';

const { Paragraph, Text } = Typography;

type AgentMode = 'evaluation' | 'adaptation';
type EvalKind = 'operator_test' | 'model_deployment_test';
type SlotStep = 'mode' | 'category' | 'scenario' | 'chips' | 'chip_num' | 'tool' | 'operatorLib' | 'operatorCategories' | 'operatorCount' | 'image' | 'precision' | 'testMode' | 'description' | 'confirm' | 'done';

interface DeviceOption {
  device_type: string;
  name: string;
  manufacturer?: string;
  total_count: number;
  available_count: number;
}

interface ImageOption {
  id: number;
  asset_code?: string;
  name: string;
  description?: string;
  tags?: string[];
  chip_name?: string;
  framework_name?: string;
  model_name?: string;
}

interface ToolsetOption {
  id: number;
  asset_code?: string;
  name: string;
  description?: string;
  task_category?: string;
  task_type?: string;
}

interface OperatorLibOption {
  id: number;
  name: string;
  description?: string;
}

interface OperatorCategoryOption {
  category: string;
  count: number;
}

interface ChatMessage {
  role: 'agent' | 'user';
  text: string;
}

interface TaskDraft {
  mode?: AgentMode;
  taskKind?: EvalKind;
  scenario?: string;
  chips?: string;
  chip_num?: number;
  tool_id?: number;
  tool_code?: string;
  operatorLibId?: number;
  operatorCategories?: string[];
  operatorCount?: number;
  image_id?: number;
  image_code?: string;
  precision?: string;
  testMode?: string;
  description?: string;
}

const TEST_MODE_OPTIONS = [
  { label: '快速测试', value: 'quick' },
  { label: '标准测试', value: 'standard' },
  { label: '压力测试', value: 'stress' },
  { label: '兼容性测试', value: 'compatibility' },
];

const PRECISION_OPTIONS = [
  { label: 'FP32', value: 'fp32' },
  { label: 'FP16', value: 'fp16' },
  { label: 'BF16', value: 'bf16' },
  { label: 'INT8', value: 'int8' },
];

const normalize = (value: string) => value.trim().toLowerCase();

const chipTagMap: Record<string, string> = {
  huawei_910c: '910C',
  huawei_910b: '910B',
  cambrian_590: 'MLU590',
  kunlun_p800: 'P800',
  hygon_bw1000: 'BW1000',
  cpu_test: 'CPU',
};

function chipLabelFromDevice(device?: DeviceOption) {
  if (!device) return '';
  return device.name.replace(/（.*?）/g, '').trim();
}

function chipKeyFromImage(image: ImageOption) {
  return normalize(image.chip_name || image.name.split('-')[0] || '');
}

function frameworkKeyFromImage(image: ImageOption) {
  return normalize(image.framework_name || 'unknown');
}

function scenarioTagsFromImage(image: ImageOption, scenarioTagSet: Set<string>) {
  return (image.tags || []).filter((tag) => scenarioTagSet.has(tag));
}

interface VisualStageInfo {
  key: string;
  title: string;
  subtitle: string;
  description?: string;
  meta?: string;
  disabled?: boolean;
  selected?: boolean;
  faded?: boolean;
  onClick?: () => void;
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

const stepTitleMap: Record<SlotStep, string> = {
  mode: '选择任务模式',
  category: '选择评测大类',
  scenario: '选择子场景',
  chips: '选择芯片设备',
  chip_num: '填写设备数量',
  tool: '选择测试工具',
  operatorLib: '选择算子库',
  operatorCategories: '选择算子分类',
  operatorCount: '设置算子数量',
  image: '选择镜像',
  precision: '选择精度',
  testMode: '选择测试模式',
  description: '填写任务描述',
  confirm: '确认并创建',
  done: '任务已创建',
};

export default function DLAgentCreate() {
  const navigate = useNavigate();
  const askedStepRef = useRef<SlotStep | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      text: '你好，我是 DL 智能体。现在按固定树状流程提问：评测/适配 → 评测则先选算子/模型部署 → 子场景 → 芯片 → 镜像/工具。没有子场景，绝不会进入镜像阶段。',
    },
  ]);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({
    chip_num: 1,
    precision: 'bf16',
    testMode: 'standard',
  });
  const [currentStep, setCurrentStep] = useState<SlotStep>('mode');
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [toolsets, setToolsets] = useState<ToolsetOption[]>([]);
  const [modelToolsets, setModelToolsets] = useState<ToolsetOption[]>([]);
  const [operatorLibs, setOperatorLibs] = useState<OperatorLibOption[]>([]);
  const [operatorCategories, setOperatorCategories] = useState<OperatorCategoryOption[]>([]);
  const [allImages, setAllImages] = useState<ImageOption[]>([]);
  const [assetLoadError, setAssetLoadError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const resourceRes: any = await getResourceSummary();
        const resourcePayload = resourceRes?.data || resourceRes;
        setDevices(Array.isArray(resourcePayload?.devices_by_type) ? resourcePayload.devices_by_type : []);
      } catch {
        setDevices([]);
      }

      try {
        const toolsetRes: any = await getAssets({ asset_type: 'tool', page: 1, page_size: 100 });
        const operatorLibRes: any = await getAssets({ asset_type: 'operator', category: '算子库', page: 1, page_size: 100 });
        const operatorCategoryRes: any = await getBenchmarkCategories();

        const allImageItems: any[] = [];
        let currentPage = 1;
        const maxPageSize = 100;
        let expectedTotal = Number.POSITIVE_INFINITY;

        while (allImageItems.length < expectedTotal) {
          const params: any = { page: currentPage, page_size: maxPageSize, asset_type: 'image' };
          const res: any = await getAssets(params);
          const payload = res?.data?.data || res?.data || res || {};
          const items = Array.isArray(payload?.items) ? payload.items : [];
          expectedTotal = Number(payload?.total ?? items.length);
          allImageItems.push(...items);
          if (items.length === 0 || items.length < maxPageSize) break;
          currentPage++;
        }
        setAssetLoadError('');

        const toolsetPayload = toolsetRes?.data?.data || toolsetRes?.data || toolsetRes || {};
        const toolsetItems = Array.isArray(toolsetPayload?.items) ? toolsetPayload.items : [];
        const operatorLibPayload = operatorLibRes?.data?.data || operatorLibRes?.data || operatorLibRes || {};
        const operatorLibItems = Array.isArray(operatorLibPayload?.items) ? operatorLibPayload.items : [];
        const operatorCategoryPayload = operatorCategoryRes?.data?.data || operatorCategoryRes?.data || operatorCategoryRes || [];
        setToolsets(
          Array.isArray(toolsetItems)
            ? toolsetItems.map((item: any) => ({
                id: item.id,
                asset_code: item.asset_code,
                name: item.name,
                description: item.description,
                task_category:
                  item.category === '算子测试工具'
                    ? 'operator_test'
                    : item.category === '模型部署测试工具'
                      ? 'model_deployment_test'
                      : 'operator_test',
              }))
            : [],
        );

        setOperatorLibs(
          operatorLibItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
          })),
        );
        setOperatorCategories(Array.isArray(operatorCategoryPayload) ? operatorCategoryPayload : []);

        setAllImages(
          Array.isArray(allImageItems)
            ? allImageItems.map((item: any) => {
                let parsedTags = [];
                if (Array.isArray(item.tags)) {
                  parsedTags = item.tags;
                } else if (typeof item.tags === 'string') {
                  try {
                    const maybe = JSON.parse(item.tags);
                    parsedTags = Array.isArray(maybe) ? maybe : [];
                  } catch {
                    parsedTags = item.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
                  }
                }
                return {
                  id: item.id,
                  asset_code: item.asset_code,
                  name: item.name,
                  description: item.description,
                  tags: parsedTags,
                  chip_name: item.chip_name,
                  framework_name: item.framework_name,
                  model_name: item.model_name,
                };
              })
            : [],
        );
      } catch (error: any) {
        setToolsets([]);
        setOperatorLibs([]);
        setOperatorCategories([]);
        setAllImages([]);
        setAssetLoadError(error?.message || 'image asset load failed');
      }
    })();
  }, []);

  useEffect(() => {
    if (taskDraft.taskKind !== 'model_deployment_test' || !taskDraft.scenario) {
      setModelToolsets([]);
      return;
    }
    getAvailableToolsets(taskDraft.scenario)
      .then((res: any) => {
        const list = res?.data || res || [];
        if (Array.isArray(list)) {
          setModelToolsets(
            list.map((item: any) => ({
              id: item.id,
              asset_code: item.asset_code,
              name: item.name,
              description: item.description,
              task_category: 'model_deployment_test',
              task_type: taskDraft.scenario,
            })),
          );
        } else {
          setModelToolsets([]);
        }
      })
      .catch(() => {
        setModelToolsets([]);
      });
  }, [taskDraft.taskKind, taskDraft.scenario]);

  const scenarioOptions = useMemo(() => {
    if (taskDraft.taskKind === 'operator_test') return OPERATOR_TEST_TYPES;
    return MODEL_TEST_TYPES;
  }, [taskDraft.taskKind]);

  const selectedDevice = useMemo(() => devices.find((item) => item.device_type === taskDraft.chips), [devices, taskDraft.chips]);
  const scenarioTagSet = useMemo(() => new Set([...MODEL_TEST_TYPES, ...OPERATOR_TEST_TYPES].map((item) => item.value)), []);
  const filteredToolsets = useMemo(() => {
    if (taskDraft.taskKind === 'operator_test') {
      return toolsets.filter((item) => item.name === 'Deeplink_op_test' || item.name.includes('Deeplink_op_test'));
    }
    if (taskDraft.taskKind === 'model_deployment_test') {
      return modelToolsets;
    }
    return [];
  }, [toolsets, modelToolsets, taskDraft.taskKind]);
  const filteredImages = useMemo(() => {
    if (!taskDraft.scenario || !taskDraft.chips) return [];
    const chipTag = chipTagMap[taskDraft.chips] || '';
    return allImages.filter((item) => {
      const tags = item.tags || [];
      const matchChip = chipTag ? tags.includes(chipTag) : false;
      const matchScenario = taskDraft.scenario ? tags.includes(taskDraft.scenario) : false;
      return matchChip && matchScenario;
    });
  }, [allImages, taskDraft.scenario, taskDraft.chips]);
  const selectedImage = useMemo(() => filteredImages.find((item) => item.id === taskDraft.image_id), [filteredImages, taskDraft.image_id]);
  const imageCandidates = useMemo(() => filteredImages.slice(0, 5), [filteredImages]);
  const currentStageTitle = stepTitleMap[currentStep] || '流程进行中';
  const routePrefix = taskDraft.scenario ? TASK_TYPE_PREFIX_MAP[taskDraft.scenario] : undefined;

  const visualDeviceCandidates = useMemo(() => {
    if (taskDraft.taskKind !== 'model_deployment_test' || !taskDraft.scenario) return [] as DeviceOption[];
    const matchedChipKeys = new Set(
      allImages
        .filter((img) => scenarioTagsFromImage(img, scenarioTagSet).includes(taskDraft.scenario!))
        .map((img) => chipKeyFromImage(img)),
    );
    const online = devices.filter((device) => device.available_count > 0);
    const matched = online.filter((device) => matchedChipKeys.has(normalize(chipLabelFromDevice(device))));
    return matched.length ? matched : online;
  }, [allImages, devices, scenarioTagSet, taskDraft.taskKind, taskDraft.scenario]);

  const selectedDeviceChipKey = useMemo(() => normalize(chipLabelFromDevice(selectedDevice)), [selectedDevice]);

  const visualFrameworkCandidates = useMemo(() => {
    if (taskDraft.taskKind !== 'model_deployment_test' || !taskDraft.scenario || !selectedDeviceChipKey) return [] as { key: string; label: string; count: number }[];
    const bucket = new Map<string, { key: string; label: string; count: number }>();
    allImages
      .filter((img) => scenarioTagsFromImage(img, scenarioTagSet).includes(taskDraft.scenario!) && chipKeyFromImage(img) === selectedDeviceChipKey)
      .forEach((img) => {
        const key = frameworkKeyFromImage(img);
        const prev = bucket.get(key) || { key, label: img.framework_name || '未知框架', count: 0 };
        prev.count += 1;
        bucket.set(key, prev);
      });
    return Array.from(bucket.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [allImages, scenarioTagSet, selectedDeviceChipKey, taskDraft.taskKind, taskDraft.scenario]);

  const selectedFrameworkKey = useMemo(() => {
    if (!taskDraft.image_id) return '';
    const image = filteredImages.find((item) => item.id === taskDraft.image_id);
    return image ? frameworkKeyFromImage(image) : '';
  }, [filteredImages, taskDraft.image_id]);

  const visualImageCandidates = useMemo(() => {
    if (!selectedFrameworkKey) return filteredImages;
    return filteredImages.filter((img) => frameworkKeyFromImage(img) === selectedFrameworkKey);
  }, [filteredImages, selectedFrameworkKey]);

  const appendAgentMessage = (text: string) => setMessages((prev) => [...prev, { role: 'agent', text }]);
  const appendUserMessage = (text: string) => setMessages((prev) => [...prev, { role: 'user', text }]);

  const askStep = (step: SlotStep, text: string) => {
    setCurrentStep(step);
    if (askedStepRef.current === step) return;
    askedStepRef.current = step;
    appendAgentMessage(text);
  };

  const buildPreview = () => {
    const scenarioLabel = scenarioOptions.find((item) => item.value === taskDraft.scenario)?.label || taskDraft.scenario || '未选择';
    return [
      `模式：${taskDraft.mode === 'evaluation' ? '评测' : '适配'}`,
      taskDraft.mode === 'evaluation' ? `评测大类：${taskDraft.taskKind === 'operator_test' ? '算子测试' : '模型部署测试'}` : '适配流程',
      `子场景：${scenarioLabel}`,
      `芯片/设备：${selectedDevice?.name || taskDraft.chips || '未选择'}`,
      taskDraft.mode === 'evaluation' ? `设备数量：${taskDraft.chip_num || 1} 台` : null,
      taskDraft.taskKind === 'operator_test' ? `工具集：${filteredToolsets.find((item) => item.id === taskDraft.tool_id)?.name || '未选择'}` : `镜像：${selectedImage?.name || '未选择'}`,
      taskDraft.taskKind === 'operator_test' ? `算子库：${operatorLibs.find((item) => item.id === taskDraft.operatorLibId)?.name || '未选择'}` : null,
      taskDraft.taskKind === 'operator_test' ? `算子分类：${taskDraft.operatorCategories && taskDraft.operatorCategories.length > 0 ? taskDraft.operatorCategories.join('、') : '全部分类'}` : null,
      taskDraft.taskKind === 'operator_test' ? `测试算子数量：${taskDraft.operatorCount && taskDraft.operatorCount > 0 ? `${taskDraft.operatorCount} 个` : '全部匹配算子'}` : null,
      taskDraft.mode === 'adaptation' ? `精度：${(taskDraft.precision || '').toUpperCase()}` : null,
      taskDraft.mode === 'adaptation' ? `测试模式：${TEST_MODE_OPTIONS.find((item) => item.value === taskDraft.testMode)?.label || taskDraft.testMode}` : null,
    ].filter(Boolean).join('\n');
  };

  const driveConversation = (state: TaskDraft) => {
    if (!state.mode) {
      askStep('mode', '第一步：请选择任务模式。1. 评测  2. 适配');
      return;
    }
    if (state.mode === 'evaluation' && !state.taskKind) {
      askStep('category', '第二步：请选择评测大类。1. 算子测试  2. 模型部署测试');
      return;
    }
    if (!state.scenario) {
      const options = scenarioOptions.map((item, index) => `${index + 1}. ${item.label}（tag: ${item.value}）`).join('；');
      askStep('scenario', `第三步：请选择子场景。${options}。注意：内部会严格使用括号里的 tag 值做镜像筛选。`);
      return;
    }
    if (!state.chips) {
      const options = devices.map((item, index) => `${index + 1}. ${item.name}（value: ${item.device_type}）`).join('；');
      askStep('chips', `第四步：请选择芯片/设备。${options}。注意：内部会严格使用括号里的 value 做镜像筛选。`);
      return;
    }
    if (state.mode === 'evaluation' && !state.chip_num) {
      askStep('chip_num', '第五步：请输入设备数量，例如 1。');
      return;
    }
    if (state.mode === 'evaluation' && state.taskKind === 'operator_test' && !state.tool_id) {
      if (filteredToolsets.length === 1) {
        setTaskDraft((prev) => ({ ...prev, tool_id: filteredToolsets[0].id }));
        appendAgentMessage(`第六步：已自动选择正式工具集 ${filteredToolsets[0].name}。`);
        return;
      }
      const options = filteredToolsets.map((item, index) => `${index + 1}. ${item.name}`).join('；');
      askStep('tool', `第六步：请选择工具集。算子评测当前仅使用正式工具集：${options || '暂无匹配工具集'}`);
      return;
    }
    if (state.mode === 'evaluation' && state.taskKind === 'operator_test' && !state.operatorLibId) {
      const options = operatorLibs.map((item, index) => `${index + 1}. ${item.name}`).join('；');
      askStep('operatorLib', `第七步：请选择算子库。${options || '暂无算子库'}`);
      return;
    }
    if (state.mode === 'evaluation' && state.taskKind === 'operator_test' && state.operatorCategories === undefined) {
      const options = operatorCategories.map((item, index) => `${index + 1}. ${item.category}（${item.count}个）`).join('；');
      askStep('operatorCategories', `第八步：请选择算子分类，支持多选。可回复如“1,3,5”或直接输入分类名；如果要按 evaluation 一致覆盖全部分类，回复“全部”或“跳过”。${options}`);
      return;
    }
    if ((state.mode === 'adaptation' || state.taskKind === 'model_deployment_test') && !state.image_id) {
      const options = imageCandidates.map((item, index) => `${index + 1}. ${item.name}`).join('；');
      askStep('image', `第五步：请选择镜像。候选完全来自已确认的“子场景 + 芯片”过滤结果：${options || '当前没有匹配镜像'}。当前筛选条件是 scenario=${state.scenario}，chips=${state.chips}。`);
      return;
    }
    if (state.mode === 'evaluation' && state.taskKind === 'model_deployment_test' && !state.tool_id) {
      if (filteredToolsets.length === 1) {
        setTaskDraft((prev) => ({ ...prev, tool_id: filteredToolsets[0].id }));
        appendAgentMessage(`第六步：已自动选择模型部署测试工具集 ${filteredToolsets[0].name}。`);
        return;
      }
      const options = filteredToolsets.map((item, index) => `${index + 1}. ${item.name}`).join('；');
      askStep('tool', `第六步：请选择模型部署测试工具集。${options || '暂无匹配工具集'}`);
      return;
    }
    if (state.mode === 'adaptation' && !state.precision) {
      const options = PRECISION_OPTIONS.map((item, index) => `${index + 1}. ${item.label}`).join('；');
      askStep('precision', `第六步：请选择精度。${options}`);
      return;
    }
    if (state.mode === 'adaptation' && !state.testMode) {
      const options = TEST_MODE_OPTIONS.map((item, index) => `${index + 1}. ${item.label}`).join('；');
      askStep('testMode', `第七步：请选择测试模式。${options}`);
      return;
    }
    if (state.description === undefined) {
      askStep('description', '请先输入任务描述。这个描述会作为任务说明写入系统；如果暂时不想填，可以回复“跳过”。');
      return;
    }
    askStep('confirm', `最后一步：请确认是否创建任务。\n\n${buildPreview()}\n\n如果没问题，回复“确认”；如果还要修改，直接回复对应内容，我会继续调整。`);
  };

  const resolveByIndexOrText = (raw: string, options: { label: string; value: string | number }[]) => {
    const text = normalize(raw);
    const numeric = text.match(/^(\d+)$/);
    if (numeric) {
      const idx = Number(numeric[1]) - 1;
      return options[idx]?.value;
    }
    const matched = options.find((item) => text === normalize(item.label) || text === normalize(String(item.value)) || normalize(item.label).includes(text));
    return matched?.value;
  };

  const handleSend = () => {
    const raw = draftText.trim();
    if (!raw) return;
    appendUserMessage(raw);
    setDraftText('');

    const text = normalize(raw);
    if (text === '重来' || text === '重新开始') {
      setTaskDraft({ chip_num: 1, precision: 'bf16', testMode: 'standard' });
      askedStepRef.current = null;
      setCurrentStep('mode');
      appendAgentMessage('好的，重新开始。');
      return;
    }

    if (currentStep === 'confirm' && (text.includes('确认') || text.includes('创建') || text.includes('开始'))) {
      void handleSubmit();
      return;
    }

    askedStepRef.current = null;

    setTaskDraft((prev) => {
      const next = { ...prev };

      if (currentStep === 'mode') {
        const modeValue = resolveByIndexOrText(raw, [
          { label: '评测', value: 'evaluation' },
          { label: '适配', value: 'adaptation' },
        ]) as AgentMode | undefined;
        if (modeValue) {
          next.mode = modeValue;
          next.taskKind = modeValue === 'adaptation' ? 'model_deployment_test' : undefined;
          next.scenario = undefined;
          next.chips = undefined;
          next.image_id = undefined;
        }
      } else if (currentStep === 'category') {
        const categoryValue = resolveByIndexOrText(raw, [
          { label: '算子测试', value: 'operator_test' },
          { label: '模型部署测试', value: 'model_deployment_test' },
        ]) as EvalKind | undefined;
        if (categoryValue) {
          next.taskKind = categoryValue;
          next.scenario = undefined;
          next.chips = undefined;
          next.image_id = undefined;
          next.tool_id = undefined;
        }
      } else if (currentStep === 'scenario') {
        const scenarioValue = resolveByIndexOrText(raw, scenarioOptions.map((item) => ({ label: item.label, value: item.value })));
        if (typeof scenarioValue === 'string') {
          next.scenario = scenarioValue;
          next.chips = undefined;
          next.image_id = undefined;
        }
      } else if (currentStep === 'chips') {
        const deviceValue = resolveByIndexOrText(raw, devices.map((item) => ({ label: item.name, value: item.device_type })));
        if (typeof deviceValue === 'string') {
          next.chips = deviceValue;
          next.image_id = undefined;
        }
      } else if (currentStep === 'chip_num') {
        const m = text.match(/\d+/);
        if (m) next.chip_num = Number(m[0]);
      } else if (currentStep === 'tool') {
        const toolsetValue = resolveByIndexOrText(raw, filteredToolsets.map((item) => ({ label: item.name, value: item.id })));
        if (typeof toolsetValue === 'number') {
          next.tool_id = toolsetValue;
          next.tool_code = filteredToolsets.find((item) => item.id === toolsetValue)?.asset_code;
        }
      } else if (currentStep === 'operatorLib') {
        const operatorLibValue = resolveByIndexOrText(raw, operatorLibs.map((item) => ({ label: item.name, value: item.id })));
        if (typeof operatorLibValue === 'number') next.operatorLibId = operatorLibValue;
      } else if (currentStep === 'operatorCategories') {
        if (text.includes('全部') || text.includes('跳过')) {
          next.operatorCategories = [];
        } else {
          const parts = raw.split(/[，,、\s]+/).map((item) => item.trim()).filter(Boolean);
          const selected = new Set<string>();
          parts.forEach((part) => {
            const resolved = resolveByIndexOrText(part, operatorCategories.map((item) => ({ label: item.category, value: item.category })));
            if (typeof resolved === 'string') selected.add(resolved);
          });
          if (selected.size > 0) next.operatorCategories = Array.from(selected);
        }
      } else if (currentStep === 'operatorCount') {
        if (text.includes('全部') || text.includes('跳过')) {
          next.operatorCount = 0;
        } else {
          const m = text.match(/\d+/);
          if (m) next.operatorCount = Number(m[0]);
        }
      } else if (currentStep === 'image') {
        const imageValue = resolveByIndexOrText(raw, imageCandidates.map((item) => ({ label: item.name, value: item.id })));
        if (typeof imageValue === 'number') {
          next.image_id = imageValue;
          next.image_code = imageCandidates.find((item) => item.id === imageValue)?.asset_code;
        }
      } else if (currentStep === 'precision') {
        const precisionValue = resolveByIndexOrText(raw, PRECISION_OPTIONS.map((item) => ({ label: item.label, value: item.value })));
        if (typeof precisionValue === 'string') next.precision = precisionValue;
      } else if (currentStep === 'testMode') {
        const testModeValue = resolveByIndexOrText(raw, TEST_MODE_OPTIONS.map((item) => ({ label: item.label, value: item.value })));
        if (typeof testModeValue === 'string') next.testMode = testModeValue;
      } else if (currentStep === 'description') {
        next.description = text.includes('跳过') ? '' : raw;
      }

      return next;
    });
  };

  useEffect(() => {
    driveConversation(taskDraft);
  }, [taskDraft, devices, toolsets, operatorLibs, operatorCategories, allImages]);

  const handleSubmit = async () => {
    if (!taskDraft.mode || !taskDraft.scenario || !taskDraft.chips) return;
    setLoading(true);
    try {
      if (taskDraft.mode === 'evaluation') {
        const selectedToolset = filteredToolsets.find((item) => item.id === taskDraft.tool_id);
        const selectedImage = imageCandidates.find((item) => item.id === taskDraft.image_id) || filteredImages.find((item) => item.id === taskDraft.image_id);
        const taskName = `${taskDraft.taskKind === 'operator_test' ? '算子评测' : '模型评测'}-${taskDraft.scenario}-${Date.now()}`;
        await createEvaluation({
          name: taskName,
          description: taskDraft.description || undefined,
          task: taskDraft.taskKind === 'operator_test' ? 'operator' : 'model_deployment',
          scenario: taskDraft.scenario === 'operator_perf_accuracy' ? 'operator_accuracy_performance' : taskDraft.scenario,
          chips: taskDraft.chips,
          chip_num: taskDraft.chip_num || 1,
          visibility: 'private',
          priority: 'medium',
          tool_id: taskDraft.tool_id,
          image_id: taskDraft.taskKind === 'model_deployment_test' ? taskDraft.image_id : undefined,
          operator_lib_id: taskDraft.taskKind === 'operator_test' ? taskDraft.operatorLibId : undefined,
          operator_categories: taskDraft.taskKind === 'operator_test' && taskDraft.operatorCategories && taskDraft.operatorCategories.length > 0 ? taskDraft.operatorCategories : undefined,
          operator_count: taskDraft.taskKind === 'operator_test' && taskDraft.operatorCount ? taskDraft.operatorCount : undefined,
        } as any);
        appendAgentMessage('真实 evaluation 任务已经创建完成，我现在带你去评测任务列表。');
        setCurrentStep('done');
        message.success('DL智能体已驱动 evaluation 创建');
        setTimeout(() => navigate('/evaluations/list'), 800);
      } else {
        const taskName = `DL智能体-适配任务-${taskDraft.image_id}`;
        await createAdaptation({
          name: taskName,
          image_id: taskDraft.image_id!,
          device_type: taskDraft.chips,
          device_count: 1,
          test_mode: taskDraft.testMode || 'standard',
          precision: taskDraft.precision || 'bf16',
          save_image: false,
          config: {
            scenario_type: taskDraft.scenario,
            include_in_ranking: true,
            user_prompt: taskDraft.description || undefined,
          },
        });
        appendAgentMessage('真实 adaptation 任务已经创建完成，我现在带你去适配任务列表。');
        setCurrentStep('done');
        message.success('DL智能体已驱动 adaptation 创建');
        setTimeout(() => navigate('/adaptation/list'), 800);
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message;
      message.error(detail ? `创建失败：${detail}` : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="DL 智能体创建台"
        subtitle="用对话式流程生成正式任务。先定模式与场景，再锁定芯片环境，最后收敛到镜像 / 工具，避免错链路与错编号。"
        breadcrumbs={[{ title: 'DL智能体' }]}
        extra={
          <Space wrap>
            <Tag color="blue" icon={<PartitionOutlined />}>固定树状流程</Tag>
            <Tag color="purple">执行字段收口</Tag>
            <Tag color="cyan">场景编号对齐</Tag>
          </Space>
        }
      />

      <Card
        className="tech-panel"
        style={{ marginBottom: 16, borderRadius: 20, background: 'linear-gradient(135deg, rgba(24, 76, 167, 0.08), rgba(79, 216, 255, 0.08))', border: '1px solid rgba(47, 124, 246, 0.14)' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.72)' }}>
            <div style={{ fontSize: 12, color: '#60738f', marginBottom: 6 }}>当前阶段</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#102a4f' }}>{currentStageTitle}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#60738f' }}>当前 step = {currentStep}</div>
          </div>
          <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.72)' }}>
            <div style={{ fontSize: 12, color: '#60738f', marginBottom: 6 }}>执行语义</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Tag color="blue">taskKind={taskDraft.taskKind || '-'}</Tag>
              <Tag color="gold">scenario={taskDraft.scenario || '-'}</Tag>
              <Tag color="green">chips={taskDraft.chips || '-'}</Tag>
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.72)' }}>
            <div style={{ fontSize: 12, color: '#60738f', marginBottom: 6 }}>编号路由预期</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#102a4f' }}>{routePrefix ? `${routePrefix}xx / ${routePrefix}xxxx` : '等待 scenario 确认'}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#60738f' }}>image_id 与 tool_id 前缀需与 scenario 对齐</div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 16 }}>
        <Card className="tech-panel" style={{ minHeight: 640, display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, #2f7cf6, #4fd8ff)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 24px rgba(79, 216, 255, 0.22)' }}>
              <RobotOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#102a4f' }}>DL 智能体对话流</div>
              <div style={{ fontSize: 12, color: '#60738f' }}>先确定场景，再进入资源与镜像层，不让筛选顺序跑偏。</div>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', paddingRight: 4, marginBottom: 16 }}>
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              {messages.map((item, index) => (
                <div key={`${item.role}-${index}`} style={{ display: 'flex', justifyContent: item.role === 'agent' ? 'flex-start' : 'flex-end' }}>
                  <div style={{ maxWidth: '80%', borderRadius: 18, padding: '12px 14px', background: item.role === 'agent' ? 'linear-gradient(180deg, #f5f9ff, #eef5ff)' : 'linear-gradient(135deg, #1b3a6b, #2f7cf6)', color: item.role === 'agent' ? '#102a4f' : '#fff', boxShadow: item.role === 'agent' ? '0 8px 24px rgba(15, 34, 64, 0.06)' : '0 12px 28px rgba(27, 58, 107, 0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12, opacity: 0.85 }}>
                      {item.role === 'agent' ? <RobotOutlined /> : <UserOutlined />}
                      <span>{item.role === 'agent' ? 'DL智能体' : '你'}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{item.text}</div>
                  </div>
                </div>
              ))}
            </Space>
          </div>

          <div style={{ borderTop: '1px solid rgba(16, 42, 79, 0.08)', paddingTop: 16 }}>
            {currentStep === 'done' ? (
              <Alert type="success" showIcon message="任务已启动，正在跳转。" />
            ) : (
              <>
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="按当前问题输入序号、名称或任务描述；最后一步回复“确认”即可创建正式任务。"
                  style={{
                    width: '100%',
                    minHeight: 96,
                    borderRadius: 14,
                    border: '1px solid #d7deeb',
                    padding: 12,
                    resize: 'vertical',
                    outline: 'none',
                    font: 'inherit',
                    boxShadow: '0 8px 20px rgba(16, 42, 79, 0.05)',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 12 }}>
                  <div style={{ fontSize: 12, color: '#60738f' }}>当前流程按“场景 → 芯片 → 镜像/工具”硬约束推进。</div>
                  <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading}>发送</Button>
                </div>
              </>
            )}
          </div>
        </Card>

        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card className="tech-panel" style={{ borderRadius: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CheckCircleOutlined style={{ color: '#2f7cf6' }} />
              <div style={{ fontWeight: 700, color: '#102a4f' }}>执行字段摘要</div>
            </div>
            <Space size={[6, 6]} wrap style={{ marginBottom: 12 }}>
              {taskDraft.mode ? <Tag color="blue">mode={taskDraft.mode}</Tag> : null}
              {taskDraft.taskKind ? <Tag color="purple">taskKind={taskDraft.taskKind}</Tag> : null}
              {taskDraft.scenario ? <Tag color="gold">scenario={taskDraft.scenario}</Tag> : null}
              {taskDraft.chips ? <Tag color="green">chips={taskDraft.chips}</Tag> : null}
              {taskDraft.image_id ? <Tag color="cyan">imageDbId={taskDraft.image_id}</Tag> : null}
              {taskDraft.tool_id ? <Tag color="geekblue">toolsetDbId={taskDraft.tool_id}</Tag> : null}
            </Space>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 14, background: '#f7faff', border: '1px solid #e3edff' }}>
                <div style={{ fontSize: 12, color: '#60738f', marginBottom: 4 }}>路由规则</div>
                <Text style={{ color: '#102a4f' }}>scenario 决定编号前缀，chips 只表示芯片环境，不参与场景编号推导。</Text>
              </div>
              <div style={{ padding: 12, borderRadius: 14, background: '#f7faff', border: '1px solid #e3edff' }}>
                <div style={{ fontSize: 12, color: '#60738f', marginBottom: 4 }}>当前芯片标签</div>
                <Text style={{ color: '#102a4f' }}>{taskDraft.chips ? chipTagMap[taskDraft.chips] || taskDraft.chips : '尚未选择设备'}</Text>
              </div>
              <div style={{ padding: 12, borderRadius: 14, background: '#f7faff', border: '1px solid #e3edff' }}>
                <div style={{ fontSize: 12, color: '#60738f', marginBottom: 4 }}>候选收敛状态</div>
                <Text style={{ color: '#102a4f' }}>工具候选 {filteredToolsets.length} 个，镜像候选 {imageCandidates.length} 个{assetLoadError ? `，资产加载异常：${assetLoadError}` : ''}</Text>
              </div>
            </div>
          </Card>

          <Card className="tech-panel" style={{ borderRadius: 20 }}>
            <div style={{ fontWeight: 700, color: '#102a4f', marginBottom: 12 }}>镜像候选预览</div>
            <Alert
              type="info"
              showIcon
              message={imageCandidates.length ? imageCandidates.map((item, index) => `${index + 1}. ${item.name}`).join('；') : '当前还没有可展示的镜像候选'}
            />
            <Paragraph style={{ color: '#60738f', marginTop: 12, marginBottom: 0 }}>
              只有当模式 / 大类 / 子场景 / 芯片这几层都确认后，镜像层才会打开。这样页面观感更稳定，执行语义也更干净。
            </Paragraph>
          </Card>

          {taskDraft.taskKind === 'model_deployment_test' ? (
            <Card className="tech-panel" style={{ borderRadius: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#102a4f' }}>三层图形化选择</div>
                  <div style={{ fontSize: 12, color: '#60738f', marginTop: 4 }}>设备 → 中间层 → 镜像，未选项以灰色弱化展示，可横向拖拽查看更多。</div>
                </div>
                <Space wrap>
                  <Tag color="blue">设备 {visualDeviceCandidates.length}</Tag>
                  <Tag color="purple">中间层 {visualFrameworkCandidates.length}</Tag>
                  <Tag color="cyan">镜像 {visualImageCandidates.length}</Tag>
                </Space>
              </div>

              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <VisualStage
                  title="第一层：设备"
                  hint={taskDraft.scenario ? '根据已选子场景展示匹配设备；已选设备高亮，周边候选灰显。' : '先选择子场景后，这里会自动收敛设备候选。'}
                  items={visualDeviceCandidates.length ? visualDeviceCandidates.map((device) => {
                    const chipKey = normalize(chipLabelFromDevice(device));
                    const relatedCount = allImages.filter((img) => scenarioTagsFromImage(img, scenarioTagSet).includes(taskDraft.scenario || '') && chipKeyFromImage(img) === chipKey).length;
                    return {
                      key: device.device_type,
                      title: chipLabelFromDevice(device),
                      subtitle: `${device.manufacturer || '设备'} · 空闲 ${device.available_count} / 共 ${device.total_count}`,
                      description: relatedCount > 0 ? `当前子场景下有 ${relatedCount} 个镜像候选` : '当前子场景下暂无镜像候选',
                      selected: taskDraft.chips === device.device_type,
                      faded: Boolean(taskDraft.chips) && taskDraft.chips !== device.device_type,
                      disabled: device.available_count === 0,
                      onClick: () => setTaskDraft((prev) => ({ ...prev, chips: device.device_type, image_id: undefined })),
                    };
                  }) : [{ key: 'empty-device', title: '暂无设备候选', subtitle: taskDraft.scenario ? '当前子场景未匹配到在线设备' : '请先选择子场景', disabled: true }]}
                />

                <VisualStage
                  title="第二层：中间层"
                  hint={taskDraft.chips ? '根据设备与子场景收敛框架/中间层。' : '先完成第一层设备选择后，这里才会激活。'}
                  items={visualFrameworkCandidates.length ? visualFrameworkCandidates.map((item) => ({
                    key: item.key,
                    title: item.label,
                    subtitle: `${item.count} 个镜像候选`,
                    description: selectedDevice ? `基于 ${chipLabelFromDevice(selectedDevice)} 过滤` : '请先选择设备',
                    selected: selectedFrameworkKey === item.key,
                    faded: Boolean(selectedFrameworkKey) && selectedFrameworkKey !== item.key,
                    disabled: !taskDraft.chips,
                    onClick: () => {
                      const firstImage = filteredImages.find((img) => frameworkKeyFromImage(img) === item.key);
                      setTaskDraft((prev) => ({ ...prev, image_id: firstImage?.id }));
                    },
                  })) : [{ key: 'empty-framework', title: '暂无中间层候选', subtitle: taskDraft.chips ? '当前设备下没有匹配框架' : '请先选择设备', disabled: true }]}
                />

                <VisualStage
                  title="第三层：镜像"
                  hint={selectedFrameworkKey ? '已根据前两层结果收敛到最终镜像候选。' : '先在前两层完成选择后，这里显示镜像。'}
                  items={visualImageCandidates.length ? visualImageCandidates.map((img) => ({
                    key: String(img.id),
                    title: img.model_name || img.name,
                    subtitle: `${img.framework_name || '未知框架'} · ${img.chip_name || chipLabelFromDevice(selectedDevice) || '未知芯片'}`,
                    description: img.description || img.name,
                    meta: scenarioTagsFromImage(img, scenarioTagSet).join(' / ') || undefined,
                    selected: taskDraft.image_id === img.id,
                    faded: Boolean(taskDraft.image_id) && taskDraft.image_id !== img.id,
                    disabled: !taskDraft.chips,
                    onClick: () => setTaskDraft((prev) => ({ ...prev, image_id: img.id })),
                  })) : [{ key: 'empty-image', title: '暂无镜像候选', subtitle: selectedFrameworkKey ? '当前条件下没有匹配镜像' : '请先选择中间层', disabled: true }]}
                />
              </Space>
            </Card>
          ) : null}
        </Space>
      </div>
    </div>
  );
}
