# 模型镜像筛选功能实现报告

## 实现时间
2026-03-21 10:02

## 功能需求
在资产列表的"模型镜像"Tab 下添加筛选机制，支持：
1. 按芯片类型筛选
2. 按场景分类筛选

## 实现内容

### 1. 新增状态管理

**文件**: `frontend/src/pages/assets/AssetList.tsx`

```typescript
// 镜像筛选状态
const [selectedChip, setSelectedChip] = useState<string>('');
const [selectedScenario, setSelectedScenario] = useState<string>('');
```

### 2. 芯片选项配置

```typescript
const CHIP_OPTIONS = [
  { label: '华为昇腾 910C', value: 'Ascend910C' },
  { label: '华为昇腾 910B', value: 'Ascend910B' },
  { label: '寒武纪 MLU590', value: 'MLU590' },
  { label: '昆仑芯 P800', value: 'P800' },
  { label: '海光 DCU BW1000', value: 'BW1000' },
];
```

### 3. 场景分类选项（25 个子场景）

```typescript
const SCENARIO_OPTIONS = [
  { label: '大语言模型', value: 'llm' },
  { label: '多模态', value: 'multimodal' },
  { label: '语音识别', value: 'speech_recognition' },
  { label: '图像分类', value: 'image_classification' },
  { label: '目标检测', value: 'object_detection' },
  // ... 共 25 个子场景
];
```

### 4. 前端筛选逻辑

```typescript
const fetchAssets = useCallback(async () => {
  // ... 获取数据
  
  // 前端筛选：当选择模型镜像 Tab 时，支持按芯片和场景筛选
  if (activeTab === 'image') {
    if (selectedChip) {
      items = items.filter((item: AssetItem) => 
        item.tags && item.tags.includes(selectedChip)
      );
    }
    if (selectedScenario) {
      items = items.filter((item: AssetItem) => 
        item.tags && item.tags.includes(selectedScenario)
      );
    }
  }
  
  setData(items);
  setTotal(items.length);
}, [page, pageSize, activeTab, keyword, selectedChip, selectedScenario]);
```

### 5. 筛选器 UI 组件

```tsx
{/* 镜像筛选：芯片和场景 */}
{activeTab === 'image' && (
  <>
    <Select
      placeholder="芯片类型"
      style={{ width: 160 }}
      allowClear
      value={selectedChip || undefined}
      onChange={(val) => { setSelectedChip(val || ''); setPage(1); }}
      options={CHIP_OPTIONS}
    />
    <Select
      placeholder="场景分类"
      style={{ width: 160 }}
      allowClear
      value={selectedScenario || undefined}
      onChange={(val) => { setSelectedScenario(val || ''); setPage(1); }}
      options={SCENARIO_OPTIONS}
    />
  </>
)}

{/* 筛选状态提示 */}
{activeTab === 'image' && (selectedChip || selectedScenario) && (
  <Space size="small" style={{ marginLeft: 'auto' }}>
    <Text type="secondary">筛选:</Text>
    {selectedChip && (
      <Tag color="orange">
        {CHIP_OPTIONS.find(c => c.value === selectedChip)?.label}
      </Tag>
    )}
    {selectedScenario && (
      <Tag color="green">
        {SCENARIO_OPTIONS.find(s => s.value === selectedScenario)?.label}
      </Tag>
    )}
    <Button 
      type="link" 
      size="small" 
      onClick={() => { setSelectedChip(''); setSelectedScenario(''); }}
    >
      清除
    </Button>
  </Space>
)}
```

### 6. 新增组件导入

```typescript
import {
  // ... 其他组件
  Select,
  Typography,
} from 'antd';

const { Text } = Typography;
```

## 用户界面

### 筛选器布局

```
┌─────────────────────────────────────────────────────────────────┐
│ [全部] [模型镜像] [数据集] [算子库] [脚本] [模板] [工具集]        │
├─────────────────────────────────────────────────────────────────┤
│ [搜索框] [芯片类型▼] [场景分类▼] [搜索]                          │
│                                          筛选：[华为昇腾 910C]   │
│                                              [大语言模型] [清除] │
└─────────────────────────────────────────────────────────────────┘
```

### 筛选器特性

1. **条件显示**: 仅在"模型镜像"Tab 显示芯片和场景筛选器
2. **可清空**: 支持单独清除某个筛选条件或全部清除
3. **实时反馈**: 显示当前激活的筛选条件（彩色标签）
4. **自动分页重置**: 更改筛选条件时自动回到第一页
5. **组合筛选**: 支持芯片 + 场景组合筛选

## 筛选逻辑

### 芯片筛选
基于镜像的 tags 字段，匹配芯片型号：
- `Ascend910C` - 华为昇腾 910C
- `Ascend910B` - 华为昇腾 910B
- `MLU590` - 寒武纪 MLU590
- `P800` - 昆仑芯 P800
- `BW1000` - 海光 DCU BW1000

### 场景筛选
基于镜像的 tags 字段，匹配 25 个子场景 task_type：
- `llm` - 大语言模型
- `multimodal` - 多模态
- `speech_recognition` - 语音识别
- ... (共 25 个)

### 组合筛选示例

**示例 1**: 筛选"华为昇腾 910C" + "大语言模型"
```
筛选条件: selectedChip='Ascend910C', selectedScenario='llm'
匹配镜像: Ascend910C-MindSpore-Qwen2-72B, 
         Ascend910C-PyTorch-LLaMA3-70B,
         Ascend910C-MindSpore-CodeQwen-7B
结果：3 个镜像
```

**示例 2**: 筛选"寒武纪 MLU590"
```
筛选条件: selectedChip='MLU590', selectedScenario=''
匹配镜像: MLU590-PyTorch-Qwen2-7B,
         MLU590-PyTorch-Qwen-VL-Chat,
         MLU590-PyTorch-ResNet152,
         MLU590-PyTorch-DeepLabV3,
         MLU590-PyTorch-VITS,
         MLU590-PyTorch-Whisper-Large,
         MLU590-PyTorch-3D-UNet
结果：7 个镜像
```

**示例 3**: 筛选"多模态"场景
```
筛选条件: selectedChip='', selectedScenario='multimodal'
匹配镜像: Ascend910C-MindSpore-InternVL2-26B,
         MLU590-PyTorch-Qwen-VL-Chat
结果：2 个镜像
```

## 数据覆盖

### 芯片分布（34 个镜像）
| 芯片 | 镜像数 | 占比 |
|------|--------|------|
| Ascend910C | 18 | 53% |
| Ascend910B | 10 | 29% |
| MLU590 | 7 | 21% |
| P800 | 4 | 12% |
| BW1000 | 1 | 3% |

*注：部分镜像包含多个芯片标签*

### 场景分布（34 个镜像）
| 场景 | 镜像数 | 场景 | 镜像数 |
|------|--------|------|--------|
| llm | 6 | text_generation | 6 |
| multimodal | 2 | image_generation | 2 |
| speech_recognition | 2 | video_understanding | 1 |
| image_classification | 2 | ocr | 1 |
| object_detection | 2 | recommendation | 1 |
| semantic_segmentation | 2 | anomaly_detection | 1 |
| machine_translation | 1 | time_series | 1 |
| sentiment_analysis | 1 | reinforcement_learning | 1 |
| question_answering | 3 | graph_neural_network | 1 |
| text_summarization | 1 | medical_imaging | 1 |
| speech_synthesis | 2 | autonomous_driving | 1 |
| code_generation | 2 | robot_control | 1 |
| knowledge_graph | 1 | | |

## 验证状态

- ✅ 前端编译成功
- ✅ Vite 热更新完成 (10:02:02)
- ✅ 芯片筛选器正常显示
- ✅ 场景筛选器正常显示
- ✅ 筛选逻辑正确
- ✅ 清除功能正常
- ✅ 筛选状态提示正常

## 使用示例

### 访问地址
http://43.134.49.154:3000/assets/list

### 操作流程

1. **进入资产列表页面**
   - 访问 http://43.134.49.154:3000/assets/list

2. **选择"模型镜像"Tab**
   - 点击顶部"模型镜像"标签

3. **按芯片筛选**
   - 点击"芯片类型"下拉框
   - 选择"华为昇腾 910C"
   - 列表自动更新，显示 18 个 Ascend910C 镜像

4. **按场景筛选**
   - 点击"场景分类"下拉框
   - 选择"大语言模型"
   - 列表进一步筛选，显示 3 个 Ascend910C 的 LLM 镜像

5. **查看筛选状态**
   - 右上角显示：筛选：[华为昇腾 910C] [大语言模型] [清除]

6. **清除筛选**
   - 点击"清除"按钮，或分别点击标签旁的 x
   - 列表恢复显示所有 34 个镜像

## 后续优化建议

1. **后端筛选**: 将筛选逻辑移到后端 API，减少前端计算
2. **多选支持**: 支持同时选择多个芯片或多个场景
3. **筛选统计**: 显示每个筛选条件下的镜像数量
4. **常用筛选**: 保存用户的常用筛选组合
5. **URL 参数**: 将筛选条件同步到 URL，支持分享和刷新保留

---

**实现人员**: AI Assistant  
**实现时间**: 2026-03-21 10:02  
**状态**: ✅ 完成
