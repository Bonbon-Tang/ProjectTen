from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.api.v1.router import api_router

# Import all models so Base.metadata knows about them
import app.models  # noqa: F401

# Create tables (dev convenience — production should use alembic)
Base.metadata.create_all(bind=engine)


def _init_default_toolset(db):
    """Initialize the default Deeplink_op_test toolset (算子测试专用) if it doesn't exist."""
    from app.models.asset import DigitalAsset
    existing = db.query(DigitalAsset).filter(DigitalAsset.name == "Deeplink_op_test").first()
    if not existing:
        asset = DigitalAsset(
            name="Deeplink_op_test",
            description="DeepLink算子测试工具集，支持精度验证和性能Benchmark，内置100个常用算子的H100参考基线数据",
            asset_type="toolset",
            category="算子测试工具",
            tags=["算子测试", "精度验证", "性能benchmark", "H100基线"],
            version="v1.0.0",
            file_path="/tools/deeplink_op_test",
            file_size=0,
            status="active",
            creator_id=None,
            is_shared=True,
            share_scope="platform",
        )
        db.add(asset)
    else:
        # Ensure existing toolset has correct category
        if existing.category != "算子测试工具":
            existing.category = "算子测试工具"
    db.commit()


def _init_model_deploy_toolsets(db):
    """Initialize model deployment test toolsets."""
    from app.models.asset import DigitalAsset

    model_toolsets = [
        {
            "name": "LLM-Inference-Bench",
            "description": "大语言模型推理部署测试工具集，支持吞吐量、延迟、准确率、能效比和软件功能完备性测试，兼容vLLM/TGI/TensorRT-LLM等推理框架",
            "tags": ["模型部署", "LLM推理", "吞吐量", "延迟", "能效比", "vLLM", "TGI"],
            "version": "v1.0.0",
            "file_path": "/tools/llm_inference_bench",
        },
        {
            "name": "CV-Deploy-Bench",
            "description": "视觉模型部署测试工具集，支持图像分类/检测/分割模型的推理性能、准确率、能效比和软件功能完备性测试",
            "tags": ["模型部署", "CV推理", "目标检测", "图像分类", "ONNX", "TensorRT"],
            "version": "v1.0.0",
            "file_path": "/tools/cv_deploy_bench",
        },
        {
            "name": "MultiModal-Deploy-Bench",
            "description": "多模态模型部署测试工具集，支持图文/音视频多模态模型的推理吞吐量、延迟、准确率和能效比测试",
            "tags": ["模型部署", "多模态", "图文理解", "语音", "视频"],
            "version": "v1.0.0",
            "file_path": "/tools/multimodal_deploy_bench",
        },
        {
            "name": "Speech-Deploy-Bench",
            "description": "语音模型部署测试工具集，支持ASR/TTS模型推理性能、准确率(WER/CER)、实时率(RTF)和能效比测试",
            "tags": ["模型部署", "语音识别", "语音合成", "ASR", "TTS"],
            "version": "v1.0.0",
            "file_path": "/tools/speech_deploy_bench",
        },
    ]

    for ts_data in model_toolsets:
        existing = db.query(DigitalAsset).filter(DigitalAsset.name == ts_data["name"]).first()
        if existing:
            continue
        asset = DigitalAsset(
            name=ts_data["name"],
            description=ts_data["description"],
            asset_type="toolset",
            category="模型部署测试工具",
            tags=ts_data["tags"],
            version=ts_data["version"],
            file_path=ts_data["file_path"],
            file_size=0,
            status="active",
            creator_id=None,
            is_shared=True,
            share_scope="platform",
        )
        db.add(asset)
    db.commit()


def _init_operator_libraries(db):
    """Initialize preset operator libraries as assets."""
    from app.models.asset import DigitalAsset

    operator_libs = [
        {
            "name": "FlagGems",
            "description": "智源FlagGems算子库，基于OpenAI Triton的高性能GPU算子库，覆盖点对点、归约、矩阵乘等常用算子，支持PyTorch后端自动替换",
            "category": "算子库",
            "tags": ["智源", "Triton", "GPU算子", "FlagGems", "PyTorch"],
            "version": "v2.1.0",
            "file_path": "/libs/flaggems",
        },
        {
            "name": "DIOPI",
            "description": "DeepLink DIOPI (Device Independent Operator Interface) 算子库，提供统一的设备无关算子接口，支持多种国产芯片适配",
            "category": "算子库",
            "tags": ["DeepLink", "DIOPI", "设备无关", "国产芯片", "算子接口"],
            "version": "v2.0.0",
            "file_path": "/libs/diopi",
        },
        {
            "name": "CANN_Ascend_Ops",
            "description": "华为CANN算子库，基于昇腾AI处理器的高性能算子集合，覆盖训练和推理全流程",
            "category": "算子库",
            "tags": ["华为", "CANN", "昇腾", "Ascend", "NPU算子"],
            "version": "v8.0.0",
            "file_path": "/libs/cann_ops",
        },
        {
            "name": "BangC_Ops",
            "description": "寒武纪BANG C算子库，针对MLU架构优化的高性能算子实现",
            "category": "算子库",
            "tags": ["寒武纪", "BANG C", "MLU", "Cambricon"],
            "version": "v1.5.0",
            "file_path": "/libs/bangc_ops",
        },
        {
            "name": "XTCL_Ops",
            "description": "昆仑芯XTCL算子库，XPU架构优化的算子集合，支持昆仑芯P800等设备",
            "category": "算子库",
            "tags": ["昆仑芯", "XTCL", "XPU", "Kunlun"],
            "version": "v2.0.0",
            "file_path": "/libs/xtcl_ops",
        },
    ]

    for lib_data in operator_libs:
        existing = db.query(DigitalAsset).filter(DigitalAsset.name == lib_data["name"]).first()
        if existing:
            continue
        asset = DigitalAsset(
            name=lib_data["name"],
            description=lib_data["description"],
            asset_type="operator",
            category=lib_data["category"],
            tags=lib_data["tags"],
            version=lib_data["version"],
            file_path=lib_data["file_path"],
            file_size=0,
            status="active",
            creator_id=None,
            is_shared=True,
            share_scope="platform",
        )
        db.add(asset)
    db.commit()


def _init_model_images(db):
    """Initialize preset model deployment images (chip+framework+model)."""
    from app.models.asset import DigitalAsset

    images = [
        {"name": "910C-MindSpore-Qwen2-72B", "chip": "910C", "framework": "MindSpore", "model": "Qwen2-72B", "tags": ["910C", "MindSpore", "llm", "text_generation", "code_generation"], "device": "huawei_910c"},
        {"name": "910C-PyTorch-LLaMA3-70B", "chip": "910C", "framework": "PyTorch", "model": "LLaMA3-70B", "tags": ["910C", "PyTorch", "llm", "text_generation"], "device": "huawei_910c"},
        {"name": "910B-MindSpore-ChatGLM4-9B", "chip": "910B", "framework": "MindSpore", "model": "ChatGLM4-9B", "tags": ["910B", "MindSpore", "llm", "text_generation", "question_answering"], "device": "huawei_910b"},
        {"name": "MLU590-PyTorch-Qwen2-7B", "chip": "MLU590", "framework": "PyTorch", "model": "Qwen2-7B", "tags": ["MLU590", "PyTorch", "llm", "text_generation"], "device": "cambrian_590"},
        {"name": "P800-PaddlePaddle-ERNIE-Bot", "chip": "P800", "framework": "PaddlePaddle", "model": "ERNIE-Bot", "tags": ["P800", "PaddlePaddle", "llm", "text_generation", "question_answering"], "device": "kunlun_p800"},
        {"name": "BW1000-ROCm/PyTorch-LLaMA3-8B", "chip": "BW1000", "framework": "ROCm/PyTorch", "model": "LLaMA3-8B", "tags": ["BW1000", "ROCm/PyTorch", "llm", "text_generation"], "device": "hygon_bw1000"},
        {"name": "910C-MindSpore-InternVL2-26B", "chip": "910C", "framework": "MindSpore", "model": "InternVL2-26B", "tags": ["910C", "MindSpore", "multimodal"], "device": "huawei_910c"},
        {"name": "MLU590-PyTorch-Qwen-VL-Chat", "chip": "MLU590", "framework": "PyTorch", "model": "Qwen-VL-Chat", "tags": ["MLU590", "PyTorch", "multimodal"], "device": "cambrian_590"},
        {"name": "910C-MindSpore-YOLOv8-X", "chip": "910C", "framework": "MindSpore", "model": "YOLOv8-X", "tags": ["910C", "MindSpore", "object_detection", "image_classification"], "device": "huawei_910c"},
        {"name": "MLU590-PyTorch-ResNet152", "chip": "MLU590", "framework": "PyTorch", "model": "ResNet152", "tags": ["MLU590", "PyTorch", "image_classification"], "device": "cambrian_590"},
        {"name": "P800-PaddlePaddle-PP-YOLOE+", "chip": "P800", "framework": "PaddlePaddle", "model": "PP-YOLOE+", "tags": ["P800", "PaddlePaddle", "object_detection"], "device": "kunlun_p800"},
        {"name": "910B-MindSpore-Paraformer-Large", "chip": "910B", "framework": "MindSpore", "model": "Paraformer-Large", "tags": ["910B", "MindSpore", "speech_recognition"], "device": "huawei_910b"},
        {"name": "MLU590-PyTorch-Whisper-Large-v3", "chip": "MLU590", "framework": "PyTorch", "model": "Whisper-Large-v3", "tags": ["MLU590", "PyTorch", "speech_recognition", "speech_synthesis"], "device": "cambrian_590"},
        {"name": "910C-MindSpore-Stable-Diffusion-XL", "chip": "910C", "framework": "MindSpore", "model": "Stable-Diffusion-XL", "tags": ["910C", "MindSpore", "image_generation"], "device": "huawei_910c"},
        {"name": "P800-PaddlePaddle-PaddleOCR-v4", "chip": "P800", "framework": "PaddlePaddle", "model": "PaddleOCR-v4", "tags": ["P800", "PaddlePaddle", "ocr"], "device": "kunlun_p800"},
        {"name": "910C-MindSpore-SAM-ViT-H", "chip": "910C", "framework": "MindSpore", "model": "SAM-ViT-H", "tags": ["910C", "MindSpore", "semantic_segmentation"], "device": "huawei_910c"},
    ]

    for img in images:
        existing = db.query(DigitalAsset).filter(
            DigitalAsset.asset_type == "image",
            DigitalAsset.name == img["name"]
        ).first()
        if existing:
            continue
        asset = DigitalAsset(
            name=img["name"],
            description=f"{img['chip']} + {img['framework']} + {img['model']}",
            asset_type="image",
            category="模型部署镜像",
            tags=img["tags"],
            version="v1.0",
            file_path=f"/images/{img['name'].lower().replace(' ', '_')}",
            file_size=0,
            status="active",
            creator_id=None,
            is_shared=True,
            share_scope="platform",
        )
        db.add(asset)
    db.commit()


def _sync_elementwise_h100_baselines(db):
    """Keep the first realistic H100 baseline pilot set for 元素操作类 in sync."""
    from app.models.operator import Operator

    pilot_data = {
        "Abs": (12.1, 9.1, 8.2, 552.0, 3.8, "[1,256,56,56]"),
        "Clamp": (13.0, 9.8, 8.8, 528.0, 4.0, "[1,256,56,56]"),
        "Add": (14.2, 10.9, 9.7, 505.0, 4.3, "[1,256,56,56]"),
        "Sub": (14.5, 11.0, 9.9, 498.0, 4.3, "[1,256,56,56]"),
        "Mul": (15.3, 11.6, 10.4, 486.0, 4.5, "[1,256,56,56]"),
        "Div": (21.4, 16.5, 15.2, 362.0, 4.9, "[1,256,56,56]"),
        "Sqrt": (23.2, 17.8, 16.1, 334.0, 5.0, "[1,256,56,56]"),
        "Exp": (30.6, 24.1, 22.3, 262.0, 5.4, "[1,256,56,56]"),
        "Log": (31.7, 24.9, 23.1, 248.0, 5.5, "[1,256,56,56]"),
        "Pow": (38.5, 30.2, 27.4, 214.0, 6.0, "[1,256,56,56]"),
    }

    for name, (fp32, fp16, int8, throughput, memory, shape) in pilot_data.items():
        op = db.query(Operator).filter(Operator.name == name, Operator.category == "元素操作类").first()
        if not op:
            continue
        op.h100_fp32_latency = fp32
        op.h100_fp16_latency = fp16
        op.h100_int8_latency = int8
        op.h100_throughput = throughput
        op.h100_memory_mb = memory
        op.input_shape = shape

    db.commit()


def _init_operators(db):
    """Initialize 100 common operators with H100 benchmark baseline data."""
    from app.models.operator import Operator
    count = db.query(Operator).count()
    if count > 0:
        _sync_elementwise_h100_baselines(db)
        return

    operators_data = [
        # === 卷积类 (15个) ===
        ("Conv1d", "卷积类", "1D卷积算子，用于序列数据处理", 32.5, 9.2, 4.8, 2200, 64, "[1,64,1024]"),
        ("Conv2d", "卷积类", "2D卷积算子，深度学习最常用的卷积操作", 45.2, 12.8, 6.5, 2850, 128, "[1,3,224,224]"),
        ("Conv3d", "卷积类", "3D卷积算子，用于视频和体积数据处理", 125.6, 35.2, 18.1, 980, 256, "[1,3,16,112,112]"),
        ("ConvTranspose2d", "卷积类", "2D转置卷积(反卷积)，用于上采样和生成模型", 52.8, 14.9, 7.6, 2450, 135, "[1,64,56,56]"),
        ("DepthwiseConv2d", "卷积类", "深度可分离卷积的深度部分，MobileNet核心算子", 18.3, 5.2, 2.7, 4200, 32, "[1,64,112,112]"),
        ("GroupConv2d", "卷积类", "分组卷积，ResNeXt核心算子", 38.7, 10.9, 5.6, 3100, 96, "[1,256,56,56]"),
        ("DilatedConv2d", "卷积类", "空洞卷积/膨胀卷积，增大感受野无需增加参数", 48.9, 13.8, 7.1, 2680, 128, "[1,64,128,128]"),
        ("DeformableConv2d", "卷积类", "可变形卷积，目标检测中常用", 89.2, 25.1, 12.9, 1450, 192, "[1,64,56,56]"),
        ("Conv2d_3x3", "卷积类", "3x3卷积，最常用的卷积核尺寸", 42.1, 11.9, 6.1, 2920, 120, "[1,64,112,112]"),
        ("Conv2d_1x1", "卷积类", "1x1点卷积/瓶颈层，通道变换", 15.8, 4.5, 2.3, 5100, 48, "[1,256,56,56]"),
        ("Conv2d_5x5", "卷积类", "5x5卷积，较大感受野", 68.4, 19.3, 9.9, 2100, 160, "[1,64,56,56]"),
        ("Conv2d_7x7", "卷积类", "7x7卷积，常用于网络第一层", 95.2, 26.8, 13.8, 1620, 200, "[1,3,224,224]"),
        ("SeparableConv2d", "卷积类", "完整的可分离卷积(深度+逐点)", 22.6, 6.4, 3.3, 3900, 45, "[1,64,112,112]"),
        ("PointwiseConv2d", "卷积类", "逐点卷积，等效于1x1 Conv", 15.2, 4.3, 2.2, 5200, 46, "[1,128,56,56]"),
        ("ConvBnRelu", "卷积类", "Conv+BatchNorm+ReLU融合算子", 48.5, 13.7, 7.0, 2800, 130, "[1,64,112,112]"),

        # === 归一化类 (8个) ===
        ("BatchNorm1d", "归一化类", "1D批归一化", 5.2, 1.5, 0.8, 8500, 8, "[1,256,1024]"),
        ("BatchNorm2d", "归一化类", "2D批归一化，CNN中最常用", 6.8, 1.9, 1.0, 7800, 12, "[1,64,112,112]"),
        ("LayerNorm", "归一化类", "层归一化，Transformer核心组件", 8.5, 2.4, 1.2, 6500, 16, "[1,512,768]"),
        ("GroupNorm", "归一化类", "组归一化，小批量训练时替代BatchNorm", 9.2, 2.6, 1.3, 6100, 14, "[1,64,56,56]"),
        ("InstanceNorm", "归一化类", "实例归一化，风格迁移中常用", 7.8, 2.2, 1.1, 7000, 12, "[1,64,256,256]"),
        ("RMSNorm", "归一化类", "均方根归一化，LLaMA等模型使用", 6.2, 1.8, 0.9, 7500, 10, "[1,2048,4096]"),
        ("L2Norm", "归一化类", "L2范数归一化", 4.8, 1.4, 0.7, 9200, 8, "[1,256,512]"),
        ("SyncBatchNorm", "归一化类", "同步批归一化，分布式训练使用", 12.5, 3.5, 1.8, 5200, 18, "[1,64,112,112]"),

        # === 激活函数类 (12个) ===
        ("ReLU", "激活函数类", "修正线性单元，最常用的激活函数", 1.2, 0.4, 0.2, 25000, 4, "[1,256,56,56]"),
        ("LeakyReLU", "激活函数类", "带泄漏的ReLU", 1.5, 0.4, 0.2, 23000, 4, "[1,256,56,56]"),
        ("GELU", "激活函数类", "高斯误差线性单元，BERT/GPT常用", 3.8, 1.1, 0.6, 12000, 6, "[1,512,768]"),
        ("SiLU", "激活函数类", "SiLU/Swish激活函数，EfficientNet使用", 3.2, 0.9, 0.5, 13500, 6, "[1,256,56,56]"),
        ("Sigmoid", "激活函数类", "Sigmoid激活函数", 2.8, 0.8, 0.4, 15000, 5, "[1,256,56,56]"),
        ("Tanh", "激活函数类", "双曲正切激活函数", 3.1, 0.9, 0.5, 14000, 5, "[1,256,56,56]"),
        ("Softmax", "激活函数类", "Softmax归一化，分类层和注意力机制必备", 5.6, 1.6, 0.8, 8200, 8, "[1,512,512]"),
        ("Mish", "激活函数类", "Mish激活函数，YOLOv4使用", 4.2, 1.2, 0.6, 11000, 6, "[1,256,56,56]"),
        ("PReLU", "激活函数类", "参数化ReLU", 1.8, 0.5, 0.3, 20000, 4, "[1,256,56,56]"),
        ("ELU", "激活函数类", "指数线性单元", 2.5, 0.7, 0.4, 16000, 5, "[1,256,56,56]"),
        ("SELU", "激活函数类", "缩放指数线性单元，自归一化网络使用", 2.6, 0.7, 0.4, 15500, 5, "[1,256,56,56]"),
        ("Hardswish", "激活函数类", "硬Swish激活函数，MobileNetV3使用", 2.2, 0.6, 0.3, 18000, 5, "[1,256,56,56]"),

        # === 池化类 (6个) ===
        ("MaxPool2d", "池化类", "2D最大池化", 4.5, 1.3, 0.7, 9800, 8, "[1,64,112,112]"),
        ("AvgPool2d", "池化类", "2D平均池化", 4.2, 1.2, 0.6, 10200, 8, "[1,64,112,112]"),
        ("AdaptiveAvgPool2d", "池化类", "自适应平均池化，输出固定尺寸", 4.8, 1.4, 0.7, 9500, 8, "[1,512,7,7]"),
        ("GlobalAvgPool", "池化类", "全局平均池化，分类网络最后一层常用", 3.2, 0.9, 0.5, 12000, 6, "[1,2048,7,7]"),
        ("MaxPool3d", "池化类", "3D最大池化，视频处理使用", 12.8, 3.6, 1.9, 5500, 24, "[1,64,8,56,56]"),
        ("AvgPool1d", "池化类", "1D平均池化，序列数据使用", 2.8, 0.8, 0.4, 14000, 4, "[1,256,1024]"),

        # === 线性/矩阵类 (10个) ===
        ("Linear", "线性/矩阵类", "全连接层/线性变换", 22.1, 6.3, 3.2, 3800, 64, "[1,512,768]"),
        ("MatMul", "线性/矩阵类", "矩阵乘法，Transformer核心操作", 28.5, 8.0, 4.1, 3200, 80, "[1,512,768]x[768,768]"),
        ("BMM", "线性/矩阵类", "批量矩阵乘法", 35.2, 9.9, 5.1, 2800, 96, "[32,128,64]x[32,64,128]"),
        ("Gemm", "线性/矩阵类", "通用矩阵乘法(BLAS)", 25.8, 7.3, 3.7, 3500, 72, "[1024,1024]x[1024,1024]"),
        ("BiasAdd", "线性/矩阵类", "偏置加法", 1.8, 0.5, 0.3, 22000, 4, "[1,512,768]"),
        ("Embedding", "线性/矩阵类", "嵌入查找，NLP模型输入层", 8.5, 2.4, 1.2, 6800, 128, "[1,512] vocab=50000"),
        ("EmbeddingBag", "线性/矩阵类", "带聚合的嵌入查找", 12.2, 3.4, 1.8, 5500, 96, "[1,512] vocab=50000"),
        ("Addmm", "线性/矩阵类", "矩阵乘加操作 (beta*M + alpha*A@B)", 26.5, 7.5, 3.8, 3400, 76, "[1024,1024]"),
        ("Linear_4096x4096", "线性/矩阵类", "大尺寸全连接层(LLM常见)", 185.2, 52.1, 26.8, 1850, 512, "[1,4096,4096]"),
        ("Linear_1024x1024", "线性/矩阵类", "中等尺寸全连接层", 18.5, 5.2, 2.7, 4200, 48, "[1,1024,1024]"),

        # === 注意力机制类 (8个) ===
        ("ScaledDotProductAttention", "注意力机制类", "缩放点积注意力，Transformer基础", 65.8, 18.5, 9.5, 1800, 160, "[1,8,512,64]"),
        ("MultiHeadAttention", "注意力机制类", "多头注意力机制", 78.5, 22.1, 11.4, 1550, 192, "[1,512,768] heads=12"),
        ("FlashAttention", "注意力机制类", "Flash Attention优化实现，IO感知的精确注意力", 89.5, 18.2, 9.4, 2200, 48, "[1,8,2048,128]"),
        ("PagedAttention", "注意力机制类", "分页注意力，vLLM推理优化核心", 72.3, 20.3, 10.5, 1900, 96, "[1,32,4096,128]"),
        ("GroupQueryAttention", "注意力机制类", "分组查询注意力(GQA)，LLaMA2/Mistral使用", 68.2, 19.2, 9.9, 2000, 128, "[1,32,2048,128] kv_heads=8"),
        ("CrossAttention", "注意力机制类", "交叉注意力，编码器-解码器架构使用", 82.1, 23.1, 11.9, 1500, 180, "[1,8,512,64]"),
        ("SelfAttention", "注意力机制类", "自注意力机制", 75.6, 21.3, 10.9, 1600, 170, "[1,12,512,64]"),
        ("RotaryEmbedding", "注意力机制类", "旋转位置编码(RoPE)，LLaMA核心组件", 12.8, 3.6, 1.9, 5800, 24, "[1,32,2048,128]"),

        # === 元素操作类 (10个) ===
        ("Add", "元素操作类", "逐元素加法", 1.5, 0.4, 0.2, 28000, 4, "[1,256,56,56]"),
        ("Mul", "元素操作类", "逐元素乘法", 1.6, 0.5, 0.2, 27000, 4, "[1,256,56,56]"),
        ("Sub", "元素操作类", "逐元素减法", 1.5, 0.4, 0.2, 28000, 4, "[1,256,56,56]"),
        ("Div", "元素操作类", "逐元素除法", 2.2, 0.6, 0.3, 20000, 4, "[1,256,56,56]"),
        ("Pow", "元素操作类", "逐元素幂运算", 3.5, 1.0, 0.5, 14000, 5, "[1,256,56,56]"),
        ("Exp", "元素操作类", "逐元素指数运算", 2.8, 0.8, 0.4, 16000, 5, "[1,256,56,56]"),
        ("Log", "元素操作类", "逐元素对数运算", 3.0, 0.8, 0.4, 15000, 5, "[1,256,56,56]"),
        ("Sqrt", "元素操作类", "逐元素平方根", 2.5, 0.7, 0.4, 17000, 4, "[1,256,56,56]"),
        ("Abs", "元素操作类", "逐元素绝对值", 1.3, 0.4, 0.2, 29000, 4, "[1,256,56,56]"),
        ("Clamp", "元素操作类", "逐元素截断/钳位", 1.8, 0.5, 0.3, 24000, 4, "[1,256,56,56]"),

        # === 规约操作类 (6个) ===
        ("Sum", "规约操作类", "求和规约", 3.8, 1.1, 0.6, 12500, 6, "[1,256,56,56]"),
        ("Mean", "规约操作类", "均值规约", 4.0, 1.1, 0.6, 12000, 6, "[1,256,56,56]"),
        ("Max", "规约操作类", "最大值规约", 3.5, 1.0, 0.5, 13000, 6, "[1,256,56,56]"),
        ("Min", "规约操作类", "最小值规约", 3.5, 1.0, 0.5, 13000, 6, "[1,256,56,56]"),
        ("ArgMax", "规约操作类", "最大值索引", 4.2, 1.2, 0.6, 11500, 6, "[1,256,56,56]"),
        ("Prod", "规约操作类", "乘积规约", 4.5, 1.3, 0.7, 10800, 6, "[1,256,56,56]"),

        # === reshape/内存类 (8个) ===
        ("Reshape", "reshape/内存类", "张量重塑，零拷贝操作", 0.5, 0.2, 0.1, 50000, 2, "[1,256,56,56]"),
        ("Permute", "reshape/内存类", "维度置换/转置", 2.8, 0.8, 0.4, 16000, 4, "[1,256,56,56]"),
        ("Transpose", "reshape/内存类", "矩阵转置", 2.5, 0.7, 0.4, 17500, 4, "[1,512,768]"),
        ("Concat", "reshape/内存类", "张量拼接", 3.2, 0.9, 0.5, 14500, 8, "[1,128,56,56]x2"),
        ("Split", "reshape/内存类", "张量分割", 2.0, 0.6, 0.3, 19000, 4, "[1,256,56,56]"),
        ("Slice", "reshape/内存类", "张量切片", 1.8, 0.5, 0.3, 20000, 4, "[1,256,56,56]"),
        ("Gather", "reshape/内存类", "按索引收集元素", 5.5, 1.5, 0.8, 8500, 12, "[1,50000,768] idx=[1,512]"),
        ("Scatter", "reshape/内存类", "按索引散布元素", 6.2, 1.7, 0.9, 7800, 12, "[1,50000,768] idx=[1,512]"),

        # === 损失函数类 (5个) ===
        ("CrossEntropyLoss", "损失函数类", "交叉熵损失，分类任务标准损失函数", 8.5, 2.4, 1.2, 6800, 12, "[32,1000] targets=[32]"),
        ("MSELoss", "损失函数类", "均方误差损失", 2.2, 0.6, 0.3, 18000, 4, "[32,256]"),
        ("BCELoss", "损失函数类", "二元交叉熵损失", 3.5, 1.0, 0.5, 14000, 6, "[32,1]"),
        ("NLLLoss", "损失函数类", "负对数似然损失", 2.8, 0.8, 0.4, 16000, 4, "[32,1000] targets=[32]"),
        ("SmoothL1Loss", "损失函数类", "平滑L1损失，目标检测回归常用", 2.5, 0.7, 0.4, 17000, 4, "[32,4]"),

        # === 其他高级算子 (12个) ===
        ("Dropout", "其他高级算子", "随机丢弃，训练时正则化", 1.8, 0.5, 0.3, 22000, 4, "[1,256,56,56]"),
        ("Upsample", "其他高级算子", "上采样(最近邻/双线性)", 5.8, 1.6, 0.8, 8000, 12, "[1,64,56,56]→[1,64,112,112]"),
        ("Interpolate", "其他高级算子", "插值操作(双线性/双三次/最近邻)", 8.2, 2.3, 1.2, 6500, 16, "[1,64,56,56]→[1,64,224,224]"),
        ("GridSample", "其他高级算子", "网格采样，空间变换网络核心", 15.5, 4.4, 2.2, 4200, 24, "[1,64,56,56] grid=[1,56,56,2]"),
        ("NonMaxSuppression", "其他高级算子", "非极大值抑制(NMS)，目标检测后处理", 22.8, 6.4, 3.3, 3200, 16, "[1000,5] iou_thresh=0.5"),
        ("ROIAlign", "其他高级算子", "区域对齐池化，Mask R-CNN核心", 18.5, 5.2, 2.7, 3800, 20, "[1,256,56,56] rois=[300,5]"),
        ("RoIPool", "其他高级算子", "区域池化，Faster R-CNN使用", 15.2, 4.3, 2.2, 4100, 18, "[1,256,56,56] rois=[300,5]"),
        ("TopK", "其他高级算子", "Top-K选择", 8.8, 2.5, 1.3, 6200, 10, "[1,50000] k=100"),
        ("Sort", "其他高级算子", "张量排序", 12.5, 3.5, 1.8, 4800, 14, "[1,50000]"),
        ("Unique", "其他高级算子", "去重操作", 10.2, 2.9, 1.5, 5500, 12, "[1,10000]"),
        ("Cumsum", "其他高级算子", "累积求和", 4.5, 1.3, 0.7, 10000, 6, "[1,256,56,56]"),
        ("Where", "其他高级算子", "条件选择", 2.2, 0.6, 0.3, 18000, 5, "[1,256,56,56]"),
    ]

    for (name, category, description, fp32, fp16, int8, throughput, memory, shape) in operators_data:
        op = Operator(
            name=name,
            category=category,
            description=description,
            h100_fp32_latency=fp32,
            h100_fp16_latency=fp16,
            h100_int8_latency=int8,
            h100_throughput=throughput,
            h100_memory_mb=memory,
            input_shape=shape,
        )
        db.add(op)
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize preset devices, default toolset, and operators
    from app.services.resource_service import ResourceService
    db = SessionLocal()
    try:
        ResourceService.init_preset_devices(db)
        _init_default_toolset(db)
        _init_model_deploy_toolsets(db)
        _init_operator_libraries(db)
        _init_model_images(db)
        _init_operators(db)
    finally:
        db.close()
    yield
    # Shutdown: nothing to do


app = FastAPI(
    title="上海人工智能实验室-AGI4Sci适配&验证基地 API",
    description="Backend API for the AI chip/model evaluation platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Debug middleware to log POST bodies
import logging
from starlette.middleware.base import BaseHTTPMiddleware

class DebugLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.method == "POST" and "evaluations" in str(request.url):
            body = await request.body()
            logging.warning(f"[DEBUG] POST {request.url.path} body={body.decode()[:500]}")
        response = await call_next(request)
        if request.method == "POST" and "evaluations" in str(request.url) and response.status_code >= 400:
            logging.warning(f"[DEBUG] POST {request.url.path} => {response.status_code}")
        return response

app.add_middleware(DebugLogMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler — unified response format
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"code": -1, "message": str(exc), "data": None},
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"code": 404, "message": "Not Found", "data": None},
    )


@app.exception_handler(422)
async def validation_handler(request: Request, exc):
    import logging
    body = None
    try:
        body = await request.body()
        body = body.decode()[:500]
    except Exception:
        pass
    logging.error(f"422 Validation Error on {request.method} {request.url.path} | body={body} | errors={exc.errors() if hasattr(exc, 'errors') else str(exc)}")
    return JSONResponse(
        status_code=422,
        content={"code": 422, "message": "Validation Error", "data": exc.errors() if hasattr(exc, 'errors') else str(exc)},
    )


# Include API router
app.include_router(api_router)


@app.get("/", tags=["Health"])
def root():
    return {"code": 0, "message": "AGI4Sci适配&验证基地 API is running", "data": {"version": "1.0.0"}}


@app.get("/health", tags=["Health"])
def health():
    return {"code": 0, "message": "healthy", "data": None}
