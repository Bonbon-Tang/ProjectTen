# ProjectTen - AGI4Sci 适配&验证基地

> 上海人工智能实验室 - AGI4Sci 适配&验证基地

专业的 AI 模型与硬件评测平台，提供全面的算子精度验证、性能测试和芯片兼容性评估服务。

[![GitHub release](https://img.shields.io/github/v/release/Bonbon-Tang/ProjectTen)](https://github.com/Bonbon-Tang/ProjectTen/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 核心功能

### 算子测试
- 🔧 **算子精度验证** - FP32/FP16/INT8 三精度对比测试
- ⚡ **性能 Benchmark** - 延迟、吞吐量测试，对比 H100 基线
- 📊 **算子库支持** - FlagGems、DIOPI、CANN、BangC_Ops、XTCL_Ops
- 🎯 **批量测试** - 按分类筛选、指定数量或测试全部算子
- 📈 **结果回写** - 测试结果自动更新到 Benchmark 榜单

### 模型部署测试
- 🤖 **模型部署评测** - LLM、CV、语音、多模态等 25 类子场景
- 📦 **镜像选择** - 芯片 + 框架/中间层 + 模型组合镜像（含 DeepLink 中间层镜像）
- 📊 **综合指标** - 吞吐量、延迟、准确率、能效比、软件功能完备性
- 🏆 **部署榜单** - 按子场景分页、按准确率排名

### Benchmark 榜单
- 📊 **算子 Benchmark** - 按芯片→Shape 两级展开查看详细结果
- 🏅 **模型部署榜单** - 各子场景准确率排名，展开看性能详情
- 📈 **实时更新** - 测试完成后自动写入榜单

### 报告管理
- 📄 **真实报告** - 查看完整测试数据和逐项结果
- 💾 **报告下载** - JSON 格式导出测试报告
- 📑 **报告对比** - 多任务横向对比分析

### 资产管理
- 📦 **工具集管理** - 算子评测工具、模型部署测试工具
- 🖼️ **镜像管理** - 芯片 + 框架 + 模型组合镜像
- 📚 **算子库管理** - FlagGems 等第三方算子库

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Python 3.10+
- SQLite 3.35+

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/Bonbon-Tang/ProjectTen.git
cd ProjectTen

# 安装后端依赖
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 安装前端依赖
cd ../frontend
npm install

# 启动后端
cd ../backend
source venv/bin/activate
python run.py

# 启动前端（新终端）
cd frontend
npm run dev
```

访问 http://localhost:3000

访问 http://localhost:3000

## 🧭 使用说明

### 默认账号
- `admin / admin123`：管理员，可查看全局资源、审批租户申请、管理用户与租户
- `usr1 / 123`：普通用户，仅可登录、查看 Benchmark/资产/报告，并提交“成为租户”申请
- `tenant1 / 123`：示例租户账号，绑定租户 `tenant1`，持有 `1` 台 `huawei_910c`

### 用户、租户与审批流
- 普通用户与租户账号彻底分离：`usr1` 只是普通用户，不直接持有机器配额。
- 普通用户可在“设置 → 成为租户”提交申请。
- admin 可在 `/tenants/apply` 查看申请并审批，审批时填写：机型、数量、时长（小时）。
- 审批通过后系统会：
  - 创建或更新对应租户
  - 自动生成一个新的租户登录账号（用户名 = 申请时填写的租户名称，默认密码 = `123`）
  - 为租户分配设备和到期时间
- 普通用户可以重复提交租户申请；租户账号与普通用户账号相互独立。

### 多租户与设备租售
- admin 维护全局设备池，例如平台拥有 24 台 `910C`。
- 设备一旦租售给某租户，admin 资源总览中的可用数会扣减，例如租出 1 台后显示 `23` 台可用。
- 租户用户只看到自己被分配的设备与占用情况。
- 普通用户保留资产与报告查看能力，但 `GPU 去向` 页面为空，直到其申请并获批成为租户。

### 常见使用流程
1. 普通用户登录后，默认进入 Benchmark，并可在设置里提交“成为租户”申请。
2. admin 在 `/tenants/apply` 审批申请，填写设备类型、数量和时长。
3. 审批通过后，系统自动创建租户账号（例如 `tenant2 / 123`）。
4. 租户账号登录后可查看自己的设备，并按配额使用机器。

### 部署建议
- 生产环境建议使用独立 Python 虚拟环境和 Node 运行时，不要提交 `venv/`、运行日志和本地数据库到仓库。
- 首次部署后按需初始化示例账号与租户数据。
- 若迁移到新服务器，按照 README 安装依赖、启动前后端即可。

## 📊 预置数据

### 支持的芯片设备
- 华为昇腾 910C / 910B
- 寒武纪 MLU590
- 昆仑芯 P800
- 海光 DCU BW1000

### 算子库
- FlagGems（智源）
- DIOPI（DeepLink）
- CANN_Ascend_Ops（华为）
- BangC_Ops（寒武纪）
- XTCL_Ops（昆仑芯）

### 模型部署镜像
- 已包含按芯片 × 子场景组织的模型部署镜像池
- 追加了 `75` 个 DeepLink 中间层镜像：`Ascend910C` / `Ascend910B` / `MLU590` × `25` 个子场景
- DeepLink 镜像命名示例：`Ascend910C-DeepLink-Qwen2-7B`、`Ascend910B-DeepLink-Paraformer`、`MLU590-DeepLink-ResNet50`
- 资产页支持按芯片、框架/中间层、子场景筛选镜像

## 📁 项目结构

```
ProjectTen/
├── backend/                 # 后端 (FastAPI + SQLAlchemy)
│   ├── app/
│   │   ├── api/v1/         # REST API
│   │   ├── models/         # 数据模型
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # 业务逻辑
│   │   └── utils/          # 工具函数
│   ├── data/               # SQLite 数据库
│   └── requirements.txt
├── frontend/               # 前端 (React + TypeScript + Vite)
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 通用组件
│   │   ├── api/           # API 客户端
│   │   └── layouts/       # 布局组件
│   └── package.json
└── README.md
```

## 🛠️ 技术栈

**后端**
- FastAPI
- SQLAlchemy + SQLite
- Pydantic
- Uvicorn

**前端**
- React 18 + TypeScript
- Vite
- Ant Design
- React Router

## 📝 更新日志

### v0.0.5 (2026-03-23)
**租户申请与权限体系收尾**
- ✅ 普通用户与租户账号彻底分离：普通用户默认进入 Benchmark，不再直接进入 Dashboard / 任务系统
- ✅ 新增“成为租户”入口与申请页面，普通用户可重复提交租户申请
- ✅ admin 新增 `/tenants/apply` 租户申请审批页，可批准机型、数量、时长
- ✅ 审批通过后自动生成租户登录账号，用户名为申请时填写的租户名称，默认密码 `123`
- ✅ 资源权限收口：普通用户看不到任务创建入口，`GPU 去向` 页面为空；租户用户只看到自己设备
- ✅ 管理能力补齐：admin 可删除用户、删除租户
- ✅ 资源统计修正：admin 全局设备可用数会扣减已租售数量

### v0.0.3 (2026-03-22)
**资产列表优化**
- ✅ 分页功能：每页 20 条，支持 20/50/100 切换
- ✅ 镜像 tags 标准化：[芯片型号，框架名称，子场景...]
- ✅ 三重筛选：芯片 (910C/910B/MLU590/P800/BW1000) × 框架 (MindSpore/PyTorch/PaddlePaddle/ROCm) × 子场景 (25 类)
- ✅ 完全基于 tags 筛选，快速准确
- ✅ 精简类型：只显示镜像/数据集/算子库/工具集

**评测报告优化**
- ✅ 报告名称与评测任务对齐
- ✅ 显示评测大类（算子测试/模型部署测试）
- ✅ 显示子场景（27 类：测精度/LLM/多模态等）
- ✅ 显示设备类型（华为昇腾/寒武纪/昆仑芯/海光）
- ✅ 显示模型名称（BERT/UNet/YOLOv8 等）
- ✅ 我的存档字段与评测报告一致

**镜像管理**
- ✅ 批量更新 142 个镜像的 tags
- ✅ 镜像按芯片和子场景过滤
- ✅ 创建任务时芯片 + 子场景匹配才能选择镜像

**Bug 修复**
- ✅ 修复评测报告前端显示和操作问题
- ✅ 修复资产列表分页参数超出限制
- ✅ 修复分页切换被重置问题

### v0.0.2 (2026-03-22)
- ✅ 完善模型部署评测功能：支持芯片 + 框架 + 模型组合镜像选择
- ✅ Benchmark 榜单结果回写：测试完成自动更新榜单数据
- ✅ 资产筛选优化：支持按算子库、工具集分类筛选
- ✅ 前端体验优化：修复分页和显示问题
- ✅ 数据种子脚本：新增芯片场景和模型资产批量导入脚本
- ✅ 文档完善：新增 CHANGELOG、IMPLEMENTATION_NOTES 等文档

### v0.0.1 (2026-03-20)
- ✅ 算子测试：可选数量、批量选择分类、结果回写 Benchmark
- ✅ 模型部署测试：镜像选择、新指标（吞吐量/延迟/准确率/能效比/软件功能完备性）
- ✅ Benchmark 榜单：算子按芯片→Shape 展开、模型部署按子场景排名
- ✅ 报告管理：真实数据查看、JSON 下载
- ✅ 资产管理：工具集/算子库/镜像分类管理
- ✅ 平台品牌：上海人工智能实验室-AGI4Sci 适配&验证基地

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**上海人工智能实验室 - AGI4Sci 适配&验证基地**

## 🆕 v0.0.4

- 新增多租户与设备租售逻辑（企业租户 / 个人租户）
- 新增设备配额与到期回收机制
- 新增租户级设备可见性与任务占用逻辑
- 新增任务/资产删除权限控制（仅可删除自己创建的资源）
- 修复 Benchmark 重复记录问题：同芯片+模型仅保留最新结果

### 默认测试账号
- admin / admin123
- usr1 / 123
