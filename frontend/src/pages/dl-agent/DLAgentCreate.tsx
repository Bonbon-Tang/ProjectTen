import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Space, Tag, Typography, message } from 'antd';
import { RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { getAssets } from '@/api/assets';
import { createAdaptation } from '@/api/adaptation';
import { getBenchmarkCategories } from '@/api/benchmark';
import { createEvaluation } from '@/api/evaluations';
import { getAvailableToolsets } from '@/api/modelBenchmark';
import { getResourceSummary } from '@/api/resources';
import { MODEL_TEST_TYPES, OPERATOR_TEST_TYPES } from '@/utils/constants';

const { Paragraph } = Typography;

type AgentMode = 'evaluation' | 'adaptation';
type EvalCategory = 'operator_test' | 'model_deployment_test';
type SlotStep = 'mode' | 'category' | 'taskType' | 'deviceType' | 'deviceCount' | 'toolset' | 'operatorLib' | 'operatorCategories' | 'operatorCount' | 'imageId' | 'precision' | 'testMode' | 'description' | 'confirm' | 'done';

interface DeviceOption {
  device_type: string;
  name: string;
  total_count: number;
  available_count: number;
}

interface ImageOption {
  id: number;
  name: string;
  description?: string;
  tags?: string[];
  chip_name?: string;
  framework_name?: string;
  model_name?: string;
}

interface ToolsetOption {
  id: number;
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
  taskCategory?: EvalCategory;
  taskType?: string;
  deviceType?: string;
  deviceCount?: number;
  toolsetId?: number;
  operatorLibId?: number;
  operatorCategories?: string[];
  operatorCount?: number;
  imageId?: number;
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
    deviceCount: 1,
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
        const toolsetRes: any = await getAssets({ asset_type: 'toolset', page: 1, page_size: 100 });
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
    if (taskDraft.taskCategory !== 'model_deployment_test' || !taskDraft.taskType) {
      setModelToolsets([]);
      return;
    }
    getAvailableToolsets(taskDraft.taskType)
      .then((res: any) => {
        const list = res?.data || res || [];
        if (Array.isArray(list)) {
          setModelToolsets(
            list.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              task_category: 'model_deployment_test',
              task_type: taskDraft.taskType,
            })),
          );
        } else {
          setModelToolsets([]);
        }
      })
      .catch(() => {
        setModelToolsets([]);
      });
  }, [taskDraft.taskCategory, taskDraft.taskType]);

  const taskTypeOptions = useMemo(() => {
    if (taskDraft.taskCategory === 'operator_test') return OPERATOR_TEST_TYPES;
    return MODEL_TEST_TYPES;
  }, [taskDraft.taskCategory]);

  const selectedDevice = useMemo(() => devices.find((item) => item.device_type === taskDraft.deviceType), [devices, taskDraft.deviceType]);
  const filteredToolsets = useMemo(() => {
    if (taskDraft.taskCategory === 'operator_test') {
      return toolsets.filter((item) => item.name === 'Deeplink_op_test' || item.name.includes('Deeplink_op_test'));
    }
    if (taskDraft.taskCategory === 'model_deployment_test') {
      return modelToolsets;
    }
    return [];
  }, [toolsets, modelToolsets, taskDraft.taskCategory]);
  const filteredImages = useMemo(() => {
    if (!taskDraft.taskType || !taskDraft.deviceType) return [];
    const chipTagMap: Record<string, string> = {
      huawei_910c: '910C',
      huawei_910b: '910B',
      cambrian_590: 'MLU590',
      kunlun_p800: 'P800',
      hygon_bw1000: 'BW1000',
    };
    const chipTag = chipTagMap[taskDraft.deviceType] || '';
    return allImages.filter((item) => {
      const tags = item.tags || [];
      const matchChip = chipTag ? tags.includes(chipTag) : false;
      const matchScenario = taskDraft.taskType ? tags.includes(taskDraft.taskType) : false;
      return matchChip && matchScenario;
    });
  }, [allImages, taskDraft.taskType, taskDraft.deviceType]);
  const selectedImage = useMemo(() => filteredImages.find((item) => item.id === taskDraft.imageId), [filteredImages, taskDraft.imageId]);
  const imageCandidates = useMemo(() => filteredImages.slice(0, 5), [filteredImages]);

  const appendAgentMessage = (text: string) => setMessages((prev) => [...prev, { role: 'agent', text }]);
  const appendUserMessage = (text: string) => setMessages((prev) => [...prev, { role: 'user', text }]);

  const askStep = (step: SlotStep, text: string) => {
    setCurrentStep(step);
    if (askedStepRef.current === step) return;
    askedStepRef.current = step;
    appendAgentMessage(text);
  };

  const buildPreview = () => {
    const taskTypeLabel = taskTypeOptions.find((item) => item.value === taskDraft.taskType)?.label || taskDraft.taskType || '未选择';
    return [
      `模式：${taskDraft.mode === 'evaluation' ? '评测' : '适配'}`,
      taskDraft.mode === 'evaluation' ? `评测大类：${taskDraft.taskCategory === 'operator_test' ? '算子测试' : '模型部署测试'}` : '适配流程',
      `子场景：${taskTypeLabel}`,
      `芯片/设备：${selectedDevice?.name || taskDraft.deviceType || '未选择'}`,
      taskDraft.mode === 'evaluation' ? `设备数量：${taskDraft.deviceCount || 1} 台` : null,
      taskDraft.taskCategory === 'operator_test' ? `工具集：${filteredToolsets.find((item) => item.id === taskDraft.toolsetId)?.name || '未选择'}` : `镜像：${selectedImage?.name || '未选择'}`,
      taskDraft.taskCategory === 'operator_test' ? `算子库：${operatorLibs.find((item) => item.id === taskDraft.operatorLibId)?.name || '未选择'}` : null,
      taskDraft.taskCategory === 'operator_test' ? `算子分类：${taskDraft.operatorCategories && taskDraft.operatorCategories.length > 0 ? taskDraft.operatorCategories.join('、') : '全部分类'}` : null,
      taskDraft.taskCategory === 'operator_test' ? `测试算子数量：${taskDraft.operatorCount && taskDraft.operatorCount > 0 ? `${taskDraft.operatorCount} 个` : '全部匹配算子'}` : null,
      taskDraft.mode === 'adaptation' ? `精度：${(taskDraft.precision || '').toUpperCase()}` : null,
      taskDraft.mode === 'adaptation' ? `测试模式：${TEST_MODE_OPTIONS.find((item) => item.value === taskDraft.testMode)?.label || taskDraft.testMode}` : null,
    ].filter(Boolean).join('\n');
  };

  const driveConversation = (state: TaskDraft) => {
    if (!state.mode) {
      askStep('mode', '第一步：请选择任务模式。1. 评测  2. 适配');
      return;
    }
    if (state.mode === 'evaluation' && !state.taskCategory) {
      askStep('category', '第二步：请选择评测大类。1. 算子测试  2. 模型部署测试');
      return;
    }
    if (!state.taskType) {
      const options = taskTypeOptions.map((item, index) => `${index + 1}. ${item.label}（tag: ${item.value}）`).join('；');
      askStep('taskType', `第三步：请选择子场景。${options}。注意：内部会严格使用括号里的 tag 值做镜像筛选。`);
      return;
    }
    if (!state.deviceType) {
      const options = devices.map((item, index) => `${index + 1}. ${item.name}（value: ${item.device_type}）`).join('；');
      askStep('deviceType', `第四步：请选择芯片/设备。${options}。注意：内部会严格使用括号里的 value 做镜像筛选。`);
      return;
    }
    if (state.mode === 'evaluation' && !state.deviceCount) {
      askStep('deviceCount', '第五步：请输入设备数量，例如 1。');
      return;
    }
    if (state.mode === 'evaluation' && state.taskCategory === 'operator_test' && !state.toolsetId) {
      if (filteredToolsets.length === 1) {
        setTaskDraft((prev) => ({ ...prev, toolsetId: filteredToolsets[0].id }));
        appendAgentMessage(`第六步：已自动选择正式工具集 ${filteredToolsets[0].name}。`);
        return;
      }
      const options = filteredToolsets.map((item, index) => `${index + 1}. ${item.name}`).join('；');
      askStep('toolset', `第六步：请选择工具集。算子评测当前仅使用正式工具集：${options || '暂无匹配工具集'}`);
      return;
    }
    if (state.mode === 'evaluation' && state.taskCategory === 'operator_test' && !state.operatorLibId) {
      const options = operatorLibs.map((item, index) => `${index + 1}. ${item.name}`).join('；');
      askStep('operatorLib', `第七步：请选择算子库。${options || '暂无算子库'}`);
      return;
    }
    if (state.mode === 'evaluation' && state.taskCategory === 'operator_test' && state.operatorCategories === undefined) {
      const options = operatorCategories.map((item, index) => `${index + 1}. ${item.category}（${item.count}个）`).join('；');
      askStep('operatorCategories', `第八步：请选择算子分类，支持多选。可回复如“1,3,5”或直接输入分类名；如果要按 evaluation 一致覆盖全部分类，回复“全部”或“跳过”。${options}`);
      return;
    }
    if ((state.mode === 'adaptation' || state.taskCategory === 'model_deployment_test') && !state.imageId) {
      const options = imageCandidates.map((item, index) => `${index + 1}. ${item.name}`).join('；');
      askStep('imageId', `第五步：请选择镜像。候选完全来自已确认的“子场景 + 芯片”过滤结果：${options || '当前没有匹配镜像'}。当前筛选条件是 taskType=${state.taskType}，deviceType=${state.deviceType}。`);
      return;
    }
    if (state.mode === 'evaluation' && state.taskCategory === 'model_deployment_test' && !state.toolsetId) {
      if (filteredToolsets.length === 1) {
        setTaskDraft((prev) => ({ ...prev, toolsetId: filteredToolsets[0].id }));
        appendAgentMessage(`第六步：已自动选择模型部署测试工具集 ${filteredToolsets[0].name}。`);
        return;
      }
      const options = filteredToolsets.map((item, index) => `${index + 1}. ${item.name}`).join('；');
      askStep('toolset', `第六步：请选择模型部署测试工具集。${options || '暂无匹配工具集'}`);
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
      setTaskDraft({ deviceCount: 1, precision: 'bf16', testMode: 'standard' });
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
          next.taskCategory = modeValue === 'adaptation' ? 'model_deployment_test' : undefined;
          next.taskType = undefined;
          next.deviceType = undefined;
          next.imageId = undefined;
        }
      } else if (currentStep === 'category') {
        const categoryValue = resolveByIndexOrText(raw, [
          { label: '算子测试', value: 'operator_test' },
          { label: '模型部署测试', value: 'model_deployment_test' },
        ]) as EvalCategory | undefined;
        if (categoryValue) {
          next.taskCategory = categoryValue;
          next.taskType = undefined;
          next.deviceType = undefined;
          next.imageId = undefined;
          next.toolsetId = undefined;
        }
      } else if (currentStep === 'taskType') {
        const taskTypeValue = resolveByIndexOrText(raw, taskTypeOptions.map((item) => ({ label: item.label, value: item.value })));
        if (typeof taskTypeValue === 'string') {
          next.taskType = taskTypeValue;
          next.deviceType = undefined;
          next.imageId = undefined;
        }
      } else if (currentStep === 'deviceType') {
        const deviceValue = resolveByIndexOrText(raw, devices.map((item) => ({ label: item.name, value: item.device_type })));
        if (typeof deviceValue === 'string') {
          next.deviceType = deviceValue;
          next.imageId = undefined;
        }
      } else if (currentStep === 'deviceCount') {
        const m = text.match(/\d+/);
        if (m) next.deviceCount = Number(m[0]);
      } else if (currentStep === 'toolset') {
        const toolsetValue = resolveByIndexOrText(raw, filteredToolsets.map((item) => ({ label: item.name, value: item.id })));
        if (typeof toolsetValue === 'number') next.toolsetId = toolsetValue;
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
      } else if (currentStep === 'imageId') {
        const imageValue = resolveByIndexOrText(raw, imageCandidates.map((item) => ({ label: item.name, value: item.id })));
        if (typeof imageValue === 'number') next.imageId = imageValue;
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
    if (!taskDraft.mode || !taskDraft.taskType || !taskDraft.deviceType) return;
    setLoading(true);
    try {
      if (taskDraft.mode === 'evaluation') {
        const taskName = `${taskDraft.taskCategory === 'operator_test' ? '算子评测' : '模型评测'}-${taskDraft.taskType}-${Date.now()}`;
        await createEvaluation({
          name: taskName,
          description: taskDraft.description || undefined,
          task_category: taskDraft.taskCategory,
          task_type: taskDraft.taskType,
          device_type: taskDraft.deviceType,
          device_count: taskDraft.deviceCount || 1,
          visibility: 'private',
          priority: 'medium',
          toolset_id: taskDraft.toolsetId,
          operator_lib_id: taskDraft.taskCategory === 'operator_test' ? taskDraft.operatorLibId : undefined,
          operator_categories: taskDraft.taskCategory === 'operator_test' && taskDraft.operatorCategories && taskDraft.operatorCategories.length > 0 ? taskDraft.operatorCategories : undefined,
          operator_count: taskDraft.taskCategory === 'operator_test' && taskDraft.operatorCount ? taskDraft.operatorCount : undefined,
          image_id: taskDraft.taskCategory === 'model_deployment_test' ? taskDraft.imageId : undefined,
          config: taskDraft.taskCategory === 'model_deployment_test' ? { image_id: taskDraft.imageId } : {},
        } as any);
        appendAgentMessage('真实 evaluation 任务已经创建完成，我现在带你去评测任务列表。');
        setCurrentStep('done');
        message.success('DL智能体已驱动 evaluation 创建');
        setTimeout(() => navigate('/evaluations/list'), 800);
      } else {
        const taskName = `DL智能体-适配任务-${taskDraft.imageId}`;
        await createAdaptation({
          name: taskName,
          image_id: taskDraft.imageId!,
          device_type: taskDraft.deviceType,
          device_count: 1,
          test_mode: taskDraft.testMode || 'standard',
          precision: taskDraft.precision || 'bf16',
          save_image: false,
          config: {
            scenario_type: taskDraft.taskType,
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
        title="DL智能体"
        subtitle="按固定树状流程驱动正式任务：评测/适配 → 评测大类 → 子场景 → 芯片 → 镜像/工具。"
        breadcrumbs={[{ title: 'DL智能体' }]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }}>
        <Card className="tech-panel" style={{ minHeight: 640, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, #2f7cf6, #4fd8ff)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 24px rgba(79, 216, 255, 0.22)' }}>
              <RobotOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#102a4f' }}>DL 智能体对话框</div>
              <div style={{ fontSize: 12, color: '#60738f' }}>没有子场景确认，就绝不会进入镜像阶段。</div>
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
                  placeholder="按当前问题输入序号、名称或任务描述；最后一步回复“确认”创建。"
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
                  <div style={{ fontSize: 12, color: '#60738f' }}>当前流程是硬顺序，不会跳过子场景直接去找镜像。</div>
                  <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading}>发送</Button>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="tech-panel">
          <div style={{ fontWeight: 700, color: '#102a4f', marginBottom: 12 }}>流程状态</div>
          <Space size={[6, 6]} wrap style={{ marginBottom: 12 }}>
            {taskDraft.mode ? <Tag color="blue">mode={taskDraft.mode}</Tag> : null}
            {taskDraft.taskCategory ? <Tag color="purple">taskCategory={taskDraft.taskCategory}</Tag> : null}
            {taskDraft.taskType ? <Tag color="gold">taskType={taskDraft.taskType}</Tag> : null}
            {taskDraft.deviceType ? <Tag color="green">deviceType={taskDraft.deviceType}</Tag> : null}
            {taskDraft.imageId ? <Tag color="cyan">imageId={taskDraft.imageId}</Tag> : null}
          </Space>
          <Alert
            type="warning"
            showIcon
            message={`调试状态：step=${currentStep} | mode=${taskDraft.mode || '-'} | taskCategory=${taskDraft.taskCategory || '-'} | taskType=${taskDraft.taskType || '-'} | deviceType=${taskDraft.deviceType || '-'} | chipTag=${({huawei_910c:'910C',huawei_910b:'910B',cambrian_590:'MLU590',kunlun_p800:'P800',hygon_bw1000:'BW1000'} as any)[taskDraft.deviceType || ''] || '-'} | scenarioTag=${taskDraft.taskType || '-'} | toolsetCandidates=${filteredToolsets.length} | allImages=${allImages.length} | imageCandidates=${imageCandidates.length} | assetLoadError=${assetLoadError || '-'}`}
            style={{ marginBottom: 12 }}
          />
          <Alert
            type="info"
            showIcon
            message={`镜像候选预览：${imageCandidates.length ? imageCandidates.map((item, index) => `${index + 1}.${item.name}`).join('；') : '空'}`}
          />
          <Paragraph style={{ color: '#60738f', marginTop: 12, marginBottom: 0 }}>
            现在镜像只有在“模式/大类/子场景/芯片”都走完后才会出现。你刚才提到的问题，就是这次重点修复的逻辑。\n          </Paragraph>
        </Card>
      </div>
    </div>
  );
}
