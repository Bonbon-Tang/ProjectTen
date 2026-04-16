// 评测大类
export const EVAL_CATEGORIES = [
  { label: '算子测试', value: 'operator_test', icon: '🔧' },
  { label: '模型部署测试', value: 'model_deployment_test', icon: '🤖' },
];

export const TASK_TYPE_PREFIX_MAP: Record<string, string> = {
  operator_perf_accuracy: '01',
  operator_accuracy: '01',
  llm: '02',
  speech_recognition: '03',
  multimodal: '04',
  image_classification: '05',
  object_detection: '06',
  semantic_segmentation: '07',
  text_generation: '08',
  machine_translation: '09',
  sentiment_analysis: '10',
  question_answering: '11',
  text_summarization: '12',
  speech_synthesis: '13',
  image_generation: '14',
  video_understanding: '15',
  ocr: '16',
  recommendation: '17',
  anomaly_detection: '18',
  time_series: '19',
  reinforcement_learning: '20',
  graph_neural_network: '21',
  medical_imaging: '22',
  autonomous_driving: '23',
  robot_control: '24',
  code_generation: '25',
  knowledge_graph: '26',
};

// 算子测试子类型
export const OPERATOR_TEST_TYPES = [
  { label: '测精度', value: 'operator_accuracy', description: '验证算子在国产芯片上的精度，对比FP32/FP16/INT8结果' },
  { label: '测精度+性能', value: 'operator_perf_accuracy', description: '精度验证 + 性能Benchmark，对比H100基线数据' },
];

// 模型测试子类型（25类子场景）
export const MODEL_TEST_TYPES = [
  { label: '大语言模型', value: 'llm', description: '如GPT、LLaMA、Qwen等大语言模型推理测试' },
  { label: '多模态模型', value: 'multimodal', description: '图文/音视频多模态理解与生成' },
  { label: '语音识别', value: 'speech_recognition', description: 'ASR语音转文字识别测试' },
  { label: '图像分类', value: 'image_classification', description: 'CNN/ViT图像分类任务' },
  { label: '目标检测', value: 'object_detection', description: 'YOLO/RCNN等目标检测模型' },
  { label: '语义分割', value: 'semantic_segmentation', description: '像素级图像语义分割' },
  { label: '文本生成', value: 'text_generation', description: '文本续写、创作等生成任务' },
  { label: '机器翻译', value: 'machine_translation', description: '多语言机器翻译测试' },
  { label: '情感分析', value: 'sentiment_analysis', description: '文本情感倾向分析' },
  { label: '问答系统', value: 'question_answering', description: '阅读理解与问答任务' },
  { label: '文本摘要', value: 'text_summarization', description: '文档自动摘要生成' },
  { label: '语音合成', value: 'speech_synthesis', description: 'TTS语音合成测试' },
  { label: '图像生成', value: 'image_generation', description: 'Stable Diffusion等图像生成' },
  { label: '视频理解', value: 'video_understanding', description: '视频内容理解与分析' },
  { label: '文字识别(OCR)', value: 'ocr', description: '文档/图片文字识别' },
  { label: '推荐系统', value: 'recommendation', description: '个性化推荐模型测试' },
  { label: '异常检测', value: 'anomaly_detection', description: '数据异常检测模型' },
  { label: '时序预测', value: 'time_series', description: '时间序列预测模型' },
  { label: '强化学习', value: 'reinforcement_learning', description: 'RL策略模型测试' },
  { label: '图神经网络', value: 'graph_neural_network', description: 'GNN图数据处理' },
  { label: '医学影像', value: 'medical_imaging', description: '医学图像分析与诊断' },
  { label: '自动驾驶', value: 'autonomous_driving', description: '自动驾驶感知/决策模型' },
  { label: '机器人控制', value: 'robot_control', description: '机器人运动控制模型' },
  { label: '代码生成', value: 'code_generation', description: '代码自动生成与补全' },
  { label: '知识图谱', value: 'knowledge_graph', description: '知识图谱构建与推理' },
];

// 智算设备
export const DEVICE_TYPES = [
  { label: '英伟达H200', value: 'nvidia_h200', manufacturer: 'NVIDIA', total: 16, color: '#76b900' },
  { label: '华为昇腾910C', value: 'huawei_910c', manufacturer: '华为', total: 24, color: '#e6002d' },
  { label: '华为昇腾910B', value: 'huawei_910b', manufacturer: '华为', total: 24, color: '#e6002d' },
  { label: '寒武纪MLU590', value: 'cambrian_590', manufacturer: '寒武纪', total: 24, color: '#0066cc' },
  { label: '昆仑芯P800', value: 'kunlun_p800', manufacturer: '昆仑芯', total: 12, color: '#00aa44' },
  { label: '海光DCU BW1000', value: 'hygon_bw1000', manufacturer: '海光', total: 8, color: '#6633cc' },
  { label: '本机 CPU 测试节点', value: 'cpu_test', manufacturer: '本机容器节点', total: 1, color: '#8a5a00' },
];

// 评测状态
export const EVAL_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TERMINATED: 'terminated',
} as const;

export const EVAL_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待执行', color: 'default' },
  queued: { label: '排队中', color: 'blue' },
  running: { label: '运行中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
  terminated: { label: '已终止', color: 'default' },
};

// 保留旧的评测类型，兼容已有引用
export const EVAL_TYPES = [
  { label: '性能测试', value: 'performance' },
  { label: '精度测试', value: 'accuracy' },
  { label: '兼容性测试', value: 'compatibility' },
  { label: '压力测试', value: 'stress' },
  { label: '功能验证', value: 'functional' },
];

// 优先级
export const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'default' },
  medium: { label: '中', color: 'blue' },
  high: { label: '高', color: 'orange' },
  critical: { label: '紧急', color: 'red' },
};

// 资产类型
export const ASSET_TYPES = [
  { label: '模型镜像', value: 'image', key: 'image' },
  { label: '数据集', value: 'dataset', key: 'dataset' },
  { label: '算子库', value: 'operator', key: 'operator' },
  { label: '脚本', value: 'script', key: 'script' },
  { label: '模板', value: 'template', key: 'template' },
  { label: '工具集', value: 'toolset', key: 'toolset' },
];

// 用户类型
export const USER_TYPES = [
  { label: '个人用户', value: 'personal', description: '独立研究者或开发者' },
  { label: '企业用户', value: 'enterprise', description: '企业团队使用' },
  { label: '科研机构', value: 'research', description: '高校或研究机构' },
  { label: '管理员', value: 'admin', description: '平台管理人员' },
];

// 报告类型
export const REPORT_TYPES = [
  { label: '性能报告', value: 'performance' },
  { label: '精度报告', value: 'accuracy' },
  { label: '对比报告', value: 'comparison' },
  { label: '综合报告', value: 'comprehensive' },
];

// 硬件资源规格（保留兼容）
export const RESOURCE_SPECS = [
  { label: '基础型 (4核 8G)', value: 'basic', cpu: 4, memory: 8, gpu: 0 },
  { label: '标准型 (8核 16G)', value: 'standard', cpu: 8, memory: 16, gpu: 0 },
  { label: 'GPU标准型 (8核 16G + 1xV100)', value: 'gpu-standard', cpu: 8, memory: 16, gpu: 1 },
  { label: 'GPU高性能 (16核 32G + 2xA100)', value: 'gpu-high', cpu: 16, memory: 32, gpu: 2 },
  { label: '超大规模 (32核 64G + 4xA100)', value: 'gpu-ultra', cpu: 32, memory: 64, gpu: 4 },
];
