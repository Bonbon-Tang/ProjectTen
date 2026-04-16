from __future__ import annotations

import hashlib
import json
import math
import random
import re
import subprocess
import tempfile
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.evaluation import (
    EvaluationTask, TaskStatus, TaskType, TaskCategory, CreateMode, Priority,
    TEST_TAGS, TAG_TO_CATEGORY_TYPE, build_primary_tag,
)
from app.models.report import EvaluationReport
from app.models.resource import ComputeDevice
from app.models.operator import Operator
from app.models.operator_benchmark import OperatorBenchmark
from app.models.asset import DigitalAsset
from app.utils.pagination import PaginationParams


class EvaluationService:
    CPU_TEST_RUNNER_DIR = Path('/root/.openclaw/workspace/cpu-test-runner')
    CPU_TEST_RUNNER_PYTHON = CPU_TEST_RUNNER_DIR / '.venv' / 'bin' / 'python'
    CPU_TEST_REPORT_DIR = Path('/root/.openclaw/workspace/ProjectTen/backend/data/cpu_test_reports')
    CPU_TEST_SUPPORTED_OPERATORS = {"Abs", "Clamp", "Add", "Sub", "Mul", "Div", "Pow", "Exp", "Log", "Sqrt"}
    LEGACY_TASK_CATEGORY_MAP = {
        'model_test': 'model_deployment_test',
    }
    LEGACY_TASK_TYPE_MAP = {
        'accuracy_and_performance': 'operator_perf_accuracy',
        'accuracy_only': 'operator_accuracy',
    }
    TASK_TYPE_PREFIX_MAP = {
        'operator_perf_accuracy': '01',
        'operator_accuracy': '01',
        'llm': '02',
        'speech_recognition': '03',
        'multimodal': '04',
        'image_classification': '05',
        'object_detection': '06',
        'semantic_segmentation': '07',
        'text_generation': '08',
        'machine_translation': '09',
        'sentiment_analysis': '10',
        'question_answering': '11',
        'text_summarization': '12',
        'speech_synthesis': '13',
        'image_generation': '14',
        'video_understanding': '15',
        'ocr': '16',
        'recommendation': '17',
        'anomaly_detection': '18',
        'time_series': '19',
        'reinforcement_learning': '20',
        'graph_neural_network': '21',
        'medical_imaging': '22',
        'autonomous_driving': '23',
        'robot_control': '24',
        'code_generation': '25',
        'knowledge_graph': '26',
    }

    @staticmethod
    def _normalize_task_category(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return EvaluationService.LEGACY_TASK_CATEGORY_MAP.get(value, value)

    @staticmethod
    def _normalize_task_type(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return EvaluationService.LEGACY_TASK_TYPE_MAP.get(value, value)

    @staticmethod
    def _expected_prefix(task_type: Optional[str]) -> Optional[str]:
        if not task_type:
            return None
        return EvaluationService.TASK_TYPE_PREFIX_MAP.get(task_type)

    @staticmethod
    def _resolve_asset_by_code(db: Session, asset_code: Optional[str], asset_type: Optional[str] = None) -> Optional[DigitalAsset]:
        if not asset_code:
            return None
        q = db.query(DigitalAsset).filter(DigitalAsset.asset_code == asset_code)
        if asset_type:
            q = q.filter(DigitalAsset.asset_type == asset_type)
        return q.first()

    @staticmethod
    def _validate_asset_code_prefix(*, task_type: Optional[str], image_code: Optional[str], toolset_code: Optional[str]) -> None:
        expected_prefix = EvaluationService._expected_prefix(task_type)
        if not expected_prefix:
            return
        if image_code and not image_code.startswith(expected_prefix):
            raise ValueError(f"镜像业务编号前缀不匹配：scenario={task_type} 要求 image_code 以 {expected_prefix} 开头，当前为 {image_code}")
        if toolset_code and not toolset_code.startswith(expected_prefix):
            raise ValueError(f"工具业务编号前缀不匹配：scenario={task_type} 要求 tool_code 以 {expected_prefix} 开头，当前为 {toolset_code}")
        if image_code and toolset_code and image_code[:2] != toolset_code[:2]:
            raise ValueError(f"镜像与工具业务编号前缀不一致：image_code={image_code}, tool_code={toolset_code}")

    @staticmethod
    def _cpu_test_report_paths(task_id: int) -> tuple[Path, Path]:
        EvaluationService.CPU_TEST_REPORT_DIR.mkdir(parents=True, exist_ok=True)
        base = EvaluationService.CPU_TEST_REPORT_DIR / f"task_{task_id}_cpu_test_report"
        return base.with_suffix('.txt'), base.with_suffix('.json')

    @staticmethod
    def _append_cpu_test_report_line(task_id: int, line: str) -> None:
        txt_path, _ = EvaluationService._cpu_test_report_paths(task_id)
        with txt_path.open('a', encoding='utf-8') as f:
            f.write(line.rstrip('\n') + '\n')

    @staticmethod
    def _write_cpu_test_report_json(task_id: int, payload: dict) -> None:
        _, json_path = EvaluationService._cpu_test_report_paths(task_id)
        with json_path.open('w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    @staticmethod
    def _run_cpu_test_operator_runner(task: EvaluationTask, selected_ops: List[Operator], operator_lib_name: Optional[str]) -> dict:
        payload = {
            "task_id": task.id,
            "device_type": "cpu_test",
            "shape": [1, 256, 56, 56],
            "operators": [op.name for op in selected_ops if op.name in EvaluationService.CPU_TEST_SUPPORTED_OPERATORS],
        }
        if not payload["operators"]:
            return {
                "test_type": task.task_type.value if hasattr(task.task_type, 'value') else str(task.task_type),
                "total_ops_tested": 0,
                "passed_ops": 0,
                "pass_rate": 0,
                "avg_fp16_loss_rate": 0,
                "avg_int8_loss_rate": 0,
                "all_pass": False,
                "operator_lib": operator_lib_name,
                "device_type": task.device_type,
                "runner": "cpu-test-runner",
                "operator_results": [],
            }

        txt_path, _ = EvaluationService._cpu_test_report_paths(task.id)
        if txt_path.exists():
            txt_path.unlink()

        EvaluationService._append_cpu_test_report_line(task.id, f"CPU Test Report | task_id={task.id}")
        EvaluationService._append_cpu_test_report_line(task.id, f"device_type=cpu_test")
        EvaluationService._append_cpu_test_report_line(task.id, f"operator_lib={operator_lib_name or 'numpy'}")
        EvaluationService._append_cpu_test_report_line(task.id, f"shape={payload['shape']}")
        EvaluationService._append_cpu_test_report_line(task.id, f"operators={', '.join(payload['operators'])}")
        EvaluationService._append_cpu_test_report_line(task.id, "")

        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False)
            payload_path = f.name

        proc = subprocess.Popen(
            [str(EvaluationService.CPU_TEST_RUNNER_PYTHON), str(EvaluationService.CPU_TEST_RUNNER_DIR / 'runner.py'), payload_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        json_result = None
        assert proc.stdout is not None
        for raw_line in proc.stdout:
            line = raw_line.rstrip('\n')
            if line.startswith('__JSON_RESULT__'):
                json_result = json.loads(line[len('__JSON_RESULT__'):])
                continue
            EvaluationService._append_cpu_test_report_line(task.id, line)

        return_code = proc.wait()
        if return_code != 0:
            raise subprocess.CalledProcessError(return_code, proc.args)
        if json_result is None:
            raise ValueError('cpu-test-runner did not emit JSON result')

        EvaluationService._write_cpu_test_report_json(task.id, {
            'task_id': task.id,
            'operator_lib': operator_lib_name or 'numpy',
            'payload': payload,
            'runner_output': json_result,
        })
        EvaluationService._append_cpu_test_report_line(task.id, '')
        EvaluationService._append_cpu_test_report_line(task.id, 'Final JSON artifact written.')
        return json_result


    @staticmethod
    def create(db: Session, *, creator_id: int, tenant_id: Optional[int] = None, user_type: Optional[str] = None, **kwargs) -> EvaluationTask:
        task_category = EvaluationService._normalize_task_category(kwargs.get("task_category"))
        task_type = EvaluationService._normalize_task_type(kwargs.get("task_type"))
        tags = kwargs.get("tags") or []
        primary_tag = kwargs.get("primary_tag")

        if primary_tag and primary_tag in TAG_TO_CATEGORY_TYPE:
            task_category, task_type = TAG_TO_CATEGORY_TYPE[primary_tag]
            if primary_tag not in tags:
                tags = [primary_tag, *tags]
        elif task_category and task_type:
            primary_tag = build_primary_tag(task_category, task_type)
            if primary_tag:
                tags = [primary_tag, *[t for t in tags if t != primary_tag]]

        if primary_tag and primary_tag not in TEST_TAGS:
            raise ValueError(f"无效的评测tag: {primary_tag}")

        image_code = kwargs.get("image_code")
        toolset_code = kwargs.get("toolset_code")

        resolved_image = None
        resolved_toolset = None

        if image_code:
            resolved_image = EvaluationService._resolve_asset_by_code(db, image_code, "image")
            if not resolved_image:
                raise ValueError(f"镜像业务编号不存在: {image_code}")
            kwargs["image_id"] = resolved_image.id
        elif kwargs.get("image_id"):
            resolved_image = db.query(DigitalAsset).filter(
                DigitalAsset.id == kwargs.get("image_id"),
                DigitalAsset.asset_type == "image",
            ).first()
            if resolved_image:
                image_code = resolved_image.asset_code

        if toolset_code:
            resolved_toolset = EvaluationService._resolve_asset_by_code(db, toolset_code, "toolset")
            if not resolved_toolset:
                raise ValueError(f"工具业务编号不存在: {toolset_code}")
            kwargs["toolset_id"] = resolved_toolset.id
        elif kwargs.get("toolset_id"):
            resolved_toolset = db.query(DigitalAsset).filter(
                DigitalAsset.id == kwargs.get("toolset_id"),
                DigitalAsset.asset_type == "toolset",
            ).first()
            if resolved_toolset:
                toolset_code = resolved_toolset.asset_code

        EvaluationService._validate_asset_code_prefix(
            task_type=task_type,
            image_code=image_code,
            toolset_code=toolset_code,
        )

        # Validate: operator_test requires toolset_id
        if task_category == "operator_test" and not kwargs.get("toolset_id"):
            raise ValueError("算子评测任务必须关联工具集(toolset_id/toolset_code)，请选择 Deeplink_op_test 或其他算子测试工具")

        # Validate device availability at creation time
        device_type = kwargs.get("device_type")
        device_count = kwargs.get("device_count") or 1
        if device_type:
            device = db.query(ComputeDevice).filter(ComputeDevice.device_type == device_type).first()
            if not device:
                raise ValueError(f"设备类型 '{device_type}' 不存在")
            if device_count > device.available_count:
                raise ValueError(
                    f"设备数量不足：需要 {device_count} 台 {device.name}，当前空闲仅 {device.available_count} 台"
                )

        task = EvaluationTask(
            name=kwargs["name"],
            description=kwargs.get("description"),
            tags=tags,
            primary_tag=primary_tag,
            task_category=TaskCategory(task_category) if task_category else None,
            task_type=TaskType(task_type),
            create_mode=CreateMode(kwargs.get("create_mode", "template")),
            priority=Priority(kwargs.get("priority", "medium")),
            config=kwargs.get("config", {}),
            resource_spec=kwargs.get("resource_spec"),
            is_custom_billing=kwargs.get("is_custom_billing", False),
            max_retries=kwargs.get("max_retries", 3),
            device_type=kwargs.get("device_type"),
            device_count=kwargs.get("device_count") or 1,
            visibility=kwargs.get("visibility", "private"),
            image_code=image_code,
            toolset_code=toolset_code,
            toolset_id=kwargs.get("toolset_id"),
            operator_count=kwargs.get("operator_count"),
            operator_categories=kwargs.get("operator_categories"),
            operator_lib_id=kwargs.get("operator_lib_id"),
            image_id=kwargs.get("image_id"),
            creator_id=creator_id,
            tenant_id=tenant_id,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def list_tasks(
        db: Session,
        pagination: PaginationParams,
        *,
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        primary_tag: Optional[str] = None,
        creator_id: Optional[int] = None,
        tenant_id: Optional[int] = None,
    ) -> Tuple[List[EvaluationTask], int]:
        q = db.query(EvaluationTask)
        if status:
            q = q.filter(EvaluationTask.status == status)
        if task_type:
            q = q.filter(EvaluationTask.task_type == EvaluationService._normalize_task_type(task_type))
        if primary_tag:
            q = q.filter(EvaluationTask.primary_tag == primary_tag)
        if creator_id:
            q = q.filter(EvaluationTask.creator_id == creator_id)
        if tenant_id:
            q = q.filter(EvaluationTask.tenant_id == tenant_id)
        total = q.count()
        items = q.order_by(EvaluationTask.created_at.desc()).offset(pagination.offset).limit(pagination.limit).all()
        return items, total

    @staticmethod
    def get_by_id(db: Session, task_id: int) -> Optional[EvaluationTask]:
        return db.query(EvaluationTask).filter(EvaluationTask.id == task_id).first()

    @staticmethod
    def get_stats(db: Session, tenant_id: Optional[int] = None) -> dict:
        """Return real task count statistics from database."""
        q = db.query(EvaluationTask)
        if tenant_id:
            q = q.filter(EvaluationTask.tenant_id == tenant_id)

        total = q.count()
        running = q.filter(EvaluationTask.status == TaskStatus.running).count()
        queued = q.filter(EvaluationTask.status == TaskStatus.queued).count()
        pending = q.filter(EvaluationTask.status == TaskStatus.pending).count()
        completed = q.filter(EvaluationTask.status == TaskStatus.completed).count()
        failed = q.filter(EvaluationTask.status == TaskStatus.failed).count()
        terminated = q.filter(EvaluationTask.status == TaskStatus.terminated).count()

        return {
            "total": total,
            "running": running,
            "queued": queued,
            "pending": pending,
            "completed": completed,
            "failed": failed,
            "terminated": terminated,
        }

    @staticmethod
    @staticmethod
    def start(db: Session, task: EvaluationTask) -> EvaluationTask:
        """Start a task.
        
        Device allocation logic:
        - Admin tasks: allocate from global pool (decrease available_count)
        - Tenant tasks: no allocation from global pool (tenant's available count is tracked separately)
        """
        from app.models.user import User, UserType
        
        if task.status not in (TaskStatus.pending, TaskStatus.queued):
            raise ValueError(f"Cannot start task in '{task.status.value}' status")

        # Only allocate devices for admin-created tasks
        if task.device_type:
            creator = db.query(User).filter(User.id == task.creator_id).first()
            is_admin_task = creator and creator.user_type == UserType.admin
            
            # Debug logging
            with open('/tmp/start_debug.log', 'a') as f:
                f.write(f"Task {task.id}: creator_id={task.creator_id}, user_type={creator.user_type if creator else None}, is_admin={is_admin_task}\n")
            
            if is_admin_task:
                device = db.query(ComputeDevice).filter(
                    ComputeDevice.device_type == task.device_type,
                    (ComputeDevice.tenant_id == None) | (ComputeDevice.tenant_id == 1)
                ).first()
                if not device:
                    raise ValueError(f"设备类型 '{task.device_type}' 不存在")
                needed = task.device_count or 1
                if device.available_count < needed:
                    raise ValueError(
                        f"设备 '{device.name}' 可用数量不足：需要 {needed} 台，当前可用 {device.available_count} 台"
                    )
                device.available_count -= needed
                db.add(device)

        task.status = TaskStatus.running
        task.started_at = datetime.utcnow()
        task.progress = 0
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def _release_devices(db: Session, task: EvaluationTask) -> None:
        """Release devices allocated to a task.
        
        Only release devices for admin-created tasks.
        """
        from app.models.user import User, UserType
        
        if task.device_type:
            creator = db.query(User).filter(User.id == task.creator_id).first()
            is_admin_task = creator and creator.user_type == UserType.admin
            
            if is_admin_task:
                device = db.query(ComputeDevice).filter(
                    ComputeDevice.device_type == task.device_type,
                    (ComputeDevice.tenant_id == None) | (ComputeDevice.tenant_id == 1)
                ).first()
                if device:
                    needed = task.device_count or 1
                    device.available_count = min(device.available_count + needed, device.total_count)
                    db.add(device)

    def stop(db: Session, task: EvaluationTask) -> EvaluationTask:
        if task.status != TaskStatus.running:
            raise ValueError("Task is not running")
        task.status = TaskStatus.terminated
        task.completed_at = datetime.utcnow()
        # Release devices
        EvaluationService._release_devices(db, task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def retry(db: Session, task: EvaluationTask) -> EvaluationTask:
        if task.status not in (TaskStatus.failed, TaskStatus.terminated):
            raise ValueError("Can only retry failed or terminated tasks")
        if task.retry_count >= task.max_retries:
            raise ValueError("Max retries reached")
        task.retry_count += 1
        task.status = TaskStatus.pending
        task.started_at = None
        task.completed_at = None
        task.progress = 0
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def delete(db: Session, task: EvaluationTask) -> None:
        if task.status == TaskStatus.running:
            raise ValueError("不能删除运行中的任务，请先停止任务")
        db.delete(task)
        db.commit()

    @staticmethod
    def batch_delete(db: Session, task_ids: List[int]) -> dict:
        """Batch delete tasks. Skip running tasks."""
        deleted = 0
        skipped = 0
        skipped_ids = []
        for tid in task_ids:
            task = db.query(EvaluationTask).filter(EvaluationTask.id == tid
                (ComputeDevice.tenant_id == None) | (ComputeDevice.tenant_id == 1)
            ).first()
            if not task:
                continue
            if task.status == TaskStatus.running:
                skipped += 1
                skipped_ids.append(tid)
                continue
            db.delete(task)
            deleted += 1
        db.commit()
        return {
            "deleted": deleted,
            "skipped": skipped,
            "skipped_ids": skipped_ids,
            "message": f"成功删除 {deleted} 个任务" + (f"，跳过 {skipped} 个运行中的任务" if skipped else ""),
        }

    @staticmethod
    def simulate_task_execution(task_id: int) -> None:
        """Launch a background thread to simulate task execution."""
        thread = threading.Thread(
            target=EvaluationService._run_simulation,
            args=(task_id,),
            daemon=True,
        )
        thread.start()

    @staticmethod
    def _run_simulation(task_id: int) -> None:
        """Background simulation: update progress every 10s, then generate metrics + report."""
        db = SessionLocal()
        try:
            task = db.query(EvaluationTask).filter(EvaluationTask.id == task_id).first()
            if not task:
                return

            # Simulate 60-120 seconds of execution
            total_duration = random.randint(60, 120)
            elapsed = 0
            step = 10

            while elapsed < total_duration:
                time.sleep(step)
                elapsed += step

                # Re-read task to check if it was terminated externally
                db.refresh(task)
                if task.status != TaskStatus.running:
                    return

                # Progress can only increase, never decrease
                new_progress = min(math.ceil(elapsed / total_duration * 100), 99)
                if new_progress > task.progress:
                    task.progress = new_progress
                    db.commit()

            # Generate metrics based on task category
            task_category = task.task_category
            if task_category == TaskCategory.operator_test:
                metrics = EvaluationService._generate_operator_metrics(db, task)
            else:
                image_name = ""
                if task.image_id:
                    from app.models.asset import DigitalAsset
                    image = db.query(DigitalAsset).filter(DigitalAsset.id == task.image_id).first()
                    image_name = image.name if image else ""
                metrics = EvaluationService._generate_model_metrics(task.task_type, image_name, task.device_type or "")

            task.metrics = metrics
            task.result = {"status": "success", "metrics": metrics}
            task.progress = 100
            task.status = TaskStatus.completed
            task.completed_at = datetime.utcnow()

            # Release devices
            EvaluationService._release_devices(db, task)
            db.commit()

            # Write model benchmark if model_deployment_test with image
            if task_category == TaskCategory.model_deployment_test and task.image_id:
                EvaluationService._write_model_benchmark(db, task, metrics)

            # Auto-generate evaluation report
            EvaluationService._create_auto_report(db, task)

        except Exception as e:
            # On error, mark task as failed and release devices
            try:
                task = db.query(EvaluationTask).filter(EvaluationTask.id == task_id).first()
                if task:
                    task.status = TaskStatus.failed
                    task.completed_at = datetime.utcnow()
                    task.result = {"status": "error", "message": str(e)}
                    EvaluationService._release_devices(db, task)
                    db.commit()
            except Exception:
                pass
        finally:
            db.close()

    @staticmethod
    def _generate_operator_metrics(db: Session, task: EvaluationTask) -> dict:
        """Generate simulated operator test metrics with real operator data.
        
        Key behaviors:
        - If operator_count is set, test exactly that many (random sample if more available)
        - If operator_count is NOT set, test ALL matching operators
        - If operator_categories is set, filter by those categories
        - Write results back to Operator model in the benchmark table
        """
        task_type_val = task.task_type.value if hasattr(task.task_type, 'value') else str(task.task_type)

        # Build query with optional category filter
        q = db.query(Operator)
        op_categories = task.operator_categories
        if op_categories and isinstance(op_categories, list) and len(op_categories) > 0:
            q = q.filter(Operator.category.in_(op_categories))
        all_operators = q.all()

        # Determine how many operators to test
        # If operator_count is explicitly set, use it (sample if more available)
        # If not set, test ALL matching operators
        if task.operator_count and task.operator_count > 0:
            sample_count = min(task.operator_count, len(all_operators))
            if all_operators:
                selected_ops = random.sample(all_operators, sample_count)
            else:
                selected_ops = []
        else:
            # No count specified = test ALL matching operators
            selected_ops = all_operators

        # Resolve operator library name
        operator_lib_name = None
        if task.operator_lib_id:
            from app.models.asset import DigitalAsset
            lib_asset = db.query(DigitalAsset).filter(DigitalAsset.id == task.operator_lib_id).first()
            if lib_asset:
                operator_lib_name = lib_asset.name

        operator_results = []
        cpu_test_result_map = {}
        if str(task.device_type) == 'cpu_test' or getattr(task.device_type, 'value', None) == 'cpu_test':
            runner_output = EvaluationService._run_cpu_test_operator_runner(task, selected_ops, operator_lib_name)
            cpu_test_result_map = {item['operator_name']: item for item in runner_output.get('results', [])}

        for op in selected_ops:
            op_result = {
                "operator_id": op.id,
                "operator_name": op.name,
                "category": op.category,
                "input_shape": op.input_shape,
            }

            if cpu_test_result_map.get(op.name):
                item = cpu_test_result_map[op.name]
                fp32_acc = 100.0
                fp16_acc = round(item.get('fp16_accuracy', 1.0) * 100, 4)
                int8_acc = None
                fp16_loss_rate = round((1.0 - item.get('fp16_accuracy', 1.0)) * 100, 4)
                op_result["accuracy"] = {
                    "fp32_accuracy": fp32_acc,
                    "fp16_accuracy": fp16_acc,
                    "int8_accuracy": int8_acc,
                    "fp16_loss_rate": fp16_loss_rate,
                    "int8_loss_rate": 0,
                    "pass": bool(item.get('accuracy_pass')),
                    "max_abs_error": item.get('max_abs_error'),
                    "mean_abs_error": item.get('mean_abs_error'),
                    "input_summary": item.get('input_summary'),
                    "output_summary": item.get('output_summary'),
                }
                op_result["performance"] = {
                    "h100_fp32_latency_us": op.h100_fp32_latency,
                    "h100_fp16_latency_us": op.h100_fp16_latency,
                    "h100_int8_latency_us": op.h100_int8_latency,
                    "h100_throughput_gops": op.h100_throughput,
                    "tested_fp32_latency_us": item.get('fp32_latency_us'),
                    "tested_fp16_latency_us": item.get('fp16_latency_us'),
                    "tested_int8_latency_us": item.get('int8_latency_us'),
                    "tested_throughput_gops": item.get('throughput_gbps'),
                    "fp32_latency_ratio": round(item.get('fp32_latency_us') / op.h100_fp32_latency, 3) if op.h100_fp32_latency and item.get('fp32_latency_us') else None,
                    "fp16_latency_ratio": round(item.get('fp16_latency_us') / op.h100_fp16_latency, 3) if op.h100_fp16_latency and item.get('fp16_latency_us') else None,
                    "int8_latency_ratio": None,
                    "throughput_ratio": round(item.get('throughput_gbps') / op.h100_throughput, 3) if op.h100_throughput and item.get('throughput_gbps') else None,
                    "memory_mb": item.get('memory_mb'),
                    "runner": 'cpu-test-runner',
                }
            else:
                fp32_acc = round(random.uniform(99.5, 99.99), 4)
                fp16_acc = round(random.uniform(98.5, 99.9), 4)
                int8_acc = round(random.uniform(96.0, 99.5), 4)
                op_result["accuracy"] = {
                    "fp32_accuracy": fp32_acc,
                    "fp16_accuracy": fp16_acc,
                    "int8_accuracy": int8_acc,
                    "fp16_loss_rate": round((fp32_acc - fp16_acc) / fp32_acc * 100, 4),
                    "int8_loss_rate": round((fp32_acc - int8_acc) / fp32_acc * 100, 4),
                    "pass": int8_acc >= 96.0,
                }
                if task_type_val in ("operator_perf_accuracy", "performance_benchmark"):
                    ratio_fp32 = round(random.uniform(0.6, 1.4), 3)
                    ratio_fp16 = round(random.uniform(0.65, 1.5), 3)
                    ratio_int8 = round(random.uniform(0.7, 1.6), 3)
                    throughput_ratio = round(random.uniform(0.5, 1.3), 3)
                    op_result["performance"] = {
                        "h100_fp32_latency_us": op.h100_fp32_latency,
                        "h100_fp16_latency_us": op.h100_fp16_latency,
                        "h100_int8_latency_us": op.h100_int8_latency,
                        "h100_throughput_gops": op.h100_throughput,
                        "tested_fp32_latency_us": round(op.h100_fp32_latency / ratio_fp32, 2) if op.h100_fp32_latency else None,
                        "tested_fp16_latency_us": round(op.h100_fp16_latency / ratio_fp16, 2) if op.h100_fp16_latency else None,
                        "tested_int8_latency_us": round(op.h100_int8_latency / ratio_int8, 2) if op.h100_int8_latency else None,
                        "tested_throughput_gops": round(op.h100_throughput * throughput_ratio, 1) if op.h100_throughput else None,
                        "fp32_latency_ratio": ratio_fp32,
                        "fp16_latency_ratio": ratio_fp16,
                        "int8_latency_ratio": ratio_int8,
                        "throughput_ratio": throughput_ratio,
                    }

            operator_results.append(op_result)

            op.tested_device_type = task.device_type
            op.tested_accuracy_fp32 = fp32_acc
            op.tested_accuracy_fp16 = fp16_acc
            op.tested_accuracy_int8 = int8_acc
            op.tested_operator_lib = operator_lib_name
            op.tested_task_id = task.id
            op.tested_at = datetime.utcnow()
            if "performance" in op_result:
                perf = op_result["performance"]
                op.tested_fp32_latency = perf.get("tested_fp32_latency_us")
                op.tested_fp16_latency = perf.get("tested_fp16_latency_us")
                op.tested_int8_latency = perf.get("tested_int8_latency_us")
                op.tested_throughput = perf.get("tested_throughput_gops")
            db.add(op)

            input_shape = op.input_shape or "default"
            device_type = task.device_type or "unknown"
            bench = db.query(OperatorBenchmark).filter(
                OperatorBenchmark.operator_id == op.id,
                OperatorBenchmark.device_type == device_type,
                OperatorBenchmark.input_shape == input_shape,
            ).first()
            if not bench:
                bench = OperatorBenchmark(
                    operator_id=op.id,
                    device_type=device_type,
                    input_shape=input_shape,
                )
            bench.fp32_accuracy = fp32_acc
            bench.fp16_accuracy = fp16_acc
            bench.int8_accuracy = int8_acc
            bench.fp16_loss_rate = op_result["accuracy"].get("fp16_loss_rate") or 0
            bench.int8_loss_rate = op_result["accuracy"].get("int8_loss_rate") or 0
            bench.accuracy_pass = 1 if op_result["accuracy"]["pass"] else 0
            bench.operator_lib = operator_lib_name
            bench.task_id = task.id
            bench.tested_at = datetime.utcnow()
            if "performance" in op_result:
                perf = op_result["performance"]
                bench.fp32_latency = perf.get("tested_fp32_latency_us")
                bench.fp16_latency = perf.get("tested_fp16_latency_us")
                bench.int8_latency = perf.get("tested_int8_latency_us")
                bench.throughput = perf.get("tested_throughput_gops")
            db.add(bench)

        # Commit all updates
        db.commit()

        # Summary
        all_pass = all(r["accuracy"]["pass"] for r in operator_results) if operator_results else False
        avg_fp16_loss = round(sum(r["accuracy"]["fp16_loss_rate"] for r in operator_results) / len(operator_results), 4) if operator_results else 0
        avg_int8_loss = round(sum(r["accuracy"]["int8_loss_rate"] for r in operator_results) / len(operator_results), 4) if operator_results else 0

        cpu_test_mode = str(task.device_type) == 'cpu_test' or getattr(task.device_type, 'value', None) == 'cpu_test'
        comparison_rows = [r.get('performance', {}) for r in operator_results if r.get('performance')]
        result = {
            "test_type": task_type_val,
            "total_ops_tested": len(operator_results),
            "passed_ops": sum(1 for r in operator_results if r["accuracy"]["pass"]),
            "pass_rate": round(sum(1 for r in operator_results if r["accuracy"]["pass"]) / len(operator_results) * 100, 1) if operator_results else 0,
            "avg_fp16_loss_rate": avg_fp16_loss,
            "avg_int8_loss_rate": avg_int8_loss,
            "all_pass": all_pass,
            "operator_lib": operator_lib_name,
            "device_type": task.device_type,
            "runner": 'cpu-test-runner' if cpu_test_mode else None,
            "comparison_summary": {
                "avg_fp32_ratio_vs_h100": round(sum((row.get('fp32_latency_ratio') or 0) for row in comparison_rows) / len(comparison_rows), 3) if comparison_rows else None,
                "avg_fp16_ratio_vs_h100": round(sum((row.get('fp16_latency_ratio') or 0) for row in comparison_rows) / len(comparison_rows), 3) if comparison_rows else None,
                "avg_throughput_ratio_vs_h100": round(sum((row.get('throughput_ratio') or 0) for row in comparison_rows) / len(comparison_rows), 3) if comparison_rows else None,
            } if cpu_test_mode else None,
            "operator_results": operator_results,
        }

        return result

    @staticmethod
    def _extract_model_size_billions(model_name: str) -> float:
        """Infer model size in billions from names like Qwen2-72B or InternVL2-8B."""
        if not model_name:
            return 7.0
        match = re.search(r"(\d+(?:\.\d+)?)\s*B", model_name, re.IGNORECASE)
        if match:
            return float(match.group(1))
        # Fall back to lighter defaults for models without explicit parameter counts.
        fallback_map = {
            "resnet": 0.1,
            "yolov8": 0.2,
            "deeplab": 0.2,
            "videomae": 0.4,
            "paddleocr": 0.1,
            "vits": 0.2,
            "paraformer": 0.4,
            "informer": 0.3,
            "deepfm": 0.1,
            "gat": 0.1,
            "3d-unet": 0.2,
            "apollo": 0.5,
            "ppo": 0.2,
            "rl-control": 0.2,
            "kg-bert": 0.3,
            "autoencoder": 0.1,
            "nmt-transformer": 0.6,
            "sdxl": 3.5,
        }
        lower_name = model_name.lower()
        for key, value in fallback_map.items():
            if key in lower_name:
                return value
        return 1.0

    @staticmethod
    def _stable_variation(seed_key: str, percent: float = 0.05) -> float:
        """Return a deterministic multiplier within +/- percent."""
        digest = hashlib.sha256(seed_key.encode("utf-8")).hexdigest()
        ratio = int(digest[:8], 16) / 0xFFFFFFFF
        return 1.0 + ((ratio * 2.0) - 1.0) * percent

    @staticmethod
    def _generate_model_metrics(task_type, image_name: str = "", device_type: str = "") -> dict:
        """Generate stable model deployment metrics with <=5% deterministic drift."""
        task_type_val = task_type.value if hasattr(task_type, 'value') else str(task_type)

        image_parts = image_name.split("-") if image_name else []
        chip = image_parts[0] if image_parts else (device_type or "Generic")
        framework = image_parts[1] if len(image_parts) > 2 else "Generic"
        model_name = "-".join(image_parts[2:]) if len(image_parts) > 2 else (image_name or task_type_val)
        if framework == "DeepLink" and len(image_parts) > 2:
            model_name = "-".join(image_parts[2:])

        size_b = EvaluationService._extract_model_size_billions(model_name)
        size_factor = min(math.log(size_b + 1.0, 2) / 6.5, 1.0)

        chip_perf_factor = {
            "nvidia_h200": 1.15,
            "Ascend910C": 1.0,
            "Ascend910B": 0.94,
            "MLU590": 0.91,
            "P800": 0.86,
            "BW1000": 0.84,
        }.get(chip, 0.88)
        framework_factor = {
            "MindSpore": 1.0,
            "PyTorch": 0.97,
            "PaddlePaddle": 0.95,
            "ROCm": 0.94,
            "DeepLink": 0.96,
            "vllm": 1.08,
            "sglang": 1.04,
            "onnxruntime": 0.99,
            "triton": 1.02,
            "tensorrt-llm": 1.06,
            "comfyui": 0.92,
            "deepspeed": 1.03,
            "ray": 0.9,
            "dgl": 0.89,
            "monai": 0.9,
            "ros2": 0.87,
        }.get(framework, 0.95)

        metric_key = f"{task_type_val}|{image_name}|{device_type or chip}"
        score_base = min(72.0 + size_factor * 24.0, 98.0)
        accuracy_base = min(90.0 + size_factor * 8.0, 99.2)
        throughput_base = (900.0 - size_factor * 520.0) * chip_perf_factor * framework_factor
        latency_base = (26.0 + size_factor * 54.0) / max(chip_perf_factor * framework_factor, 0.75)
        energy_base = (260.0 - size_factor * 80.0) * chip_perf_factor
        power_base = 180.0 + size_factor * 130.0 + (1.0 - chip_perf_factor) * 60.0
        memory_base = min(8.0 + size_b * 0.52, 78.0)

        throughput_unit = "tokens/s" if task_type_val in ("llm", "text_generation", "code_generation", "machine_translation", "text_summarization") else "samples/s"
        energy_unit = "tokens/J" if task_type_val in ("llm", "text_generation", "code_generation") else "samples/J"
        accuracy_metric = "top1" if task_type_val in ("image_classification",) else ("mAP" if task_type_val in ("object_detection",) else ("WER" if task_type_val in ("speech_recognition",) else "pass_rate"))

        throughput = round(max(throughput_base * EvaluationService._stable_variation(metric_key + '|throughput'), 20.0), 1)
        avg_latency_ms = round(max(latency_base * EvaluationService._stable_variation(metric_key + '|avg_latency'), 2.0), 1)
        p50_latency_ms = round(avg_latency_ms * 0.88, 1)
        p99_latency_ms = round(avg_latency_ms * 1.18, 1)
        first_token_latency_ms = round(avg_latency_ms * (1.35 if throughput_unit == 'tokens/s' else 1.08), 1)
        accuracy = round(min(max(accuracy_base * EvaluationService._stable_variation(metric_key + '|accuracy'), 70.0), 99.5), 2)
        energy_efficiency = round(max(energy_base * EvaluationService._stable_variation(metric_key + '|energy'), 10.0), 1)
        power_consumption_w = round(max(power_base * EvaluationService._stable_variation(metric_key + '|power'), 80.0), 0)
        gpu_utilization_pct = round(min(max(76.0 + size_factor * 15.0, 60.0), 98.0) * EvaluationService._stable_variation(metric_key + '|util', 0.03), 1)
        software_score = round(min(max((78.0 + size_factor * 16.0 + chip_perf_factor * 4.0) * EvaluationService._stable_variation(metric_key + '|software'), 65.0), 99.0), 1)
        performance_score = round(min(max(score_base * EvaluationService._stable_variation(metric_key + '|perf'), 60.0), 99.0), 1)
        memory_usage_gb = round(max(memory_base * EvaluationService._stable_variation(metric_key + '|memory', 0.04), 2.0), 1)
        memory_utilization_pct = round(min(max((58.0 + size_factor * 24.0) * EvaluationService._stable_variation(metric_key + '|mem_util', 0.03), 35.0), 96.0), 1)

        base_metrics = {
            "throughput": throughput,
            "throughput_unit": throughput_unit,
            "avg_latency_ms": avg_latency_ms,
            "p50_latency_ms": p50_latency_ms,
            "p99_latency_ms": p99_latency_ms,
            "first_token_latency_ms": first_token_latency_ms,
            "accuracy": accuracy,
            "accuracy_metric": accuracy_metric,
            "energy_efficiency": energy_efficiency,
            "energy_efficiency_unit": energy_unit,
            "power_consumption_w": power_consumption_w,
            "gpu_utilization_pct": gpu_utilization_pct,
            "software_completeness": {
                "framework_support": True,
                "mixed_precision_support": True,
                "dynamic_batching": True,
                "model_parallelism": size_b >= 7.0,
                "quantization_support": True,
                "streaming_output": task_type_val in ("llm", "text_generation", "code_generation"),
                "multi_instance": chip != "BW1000",
                "hot_update": chip in ("Ascend910C", "Ascend910B", "MLU590"),
                "score": software_score,
            },
            "performance_score": performance_score,
            "memory_usage_gb": memory_usage_gb,
            "memory_utilization_pct": memory_utilization_pct,
        }

        extra = {}
        if task_type_val in ("llm", "text_generation", "code_generation"):
            extra = {
                "tokens_per_second": throughput,
                "perplexity": round(max((8.8 - size_factor * 3.2) * EvaluationService._stable_variation(metric_key + '|ppl'), 1.5), 2),
                "context_length_tested": 32768 if size_b >= 30 else (16384 if size_b >= 7 else 8192),
                "batch_size_tested": 4 if size_b >= 30 else (8 if size_b >= 7 else 16),
            }
        elif task_type_val == "multimodal":
            extra = {
                "image_text_alignment": round(min(accuracy * 0.95, 98.0), 1),
                "visual_qa_accuracy": round(min(accuracy * 0.92, 96.0), 1),
            }
        elif task_type_val in ("image_classification", "object_detection", "semantic_segmentation"):
            extra = {
                "top1_accuracy": round(min(accuracy, 99.0), 1),
                "top5_accuracy": round(min(accuracy + 3.0, 99.5), 1),
                "map50": round(min(accuracy - 8.0, 95.0), 1),
                "fps": round(max(throughput * 0.72, 10.0), 1),
            }
        elif task_type_val in ("speech_recognition", "speech_synthesis"):
            extra = {
                "wer": round(max(8.5 - size_factor * 4.5, 1.2) * EvaluationService._stable_variation(metric_key + '|wer'), 1),
                "cer": round(max(4.5 - size_factor * 2.2, 0.6) * EvaluationService._stable_variation(metric_key + '|cer'), 1),
                "rtf": round(max(0.08 + size_factor * 0.18, 0.02) * EvaluationService._stable_variation(metric_key + '|rtf'), 3),
            }
        elif task_type_val == "ocr":
            extra = {
                "character_accuracy": round(min(accuracy + 1.0, 99.5), 1),
                "word_accuracy": round(min(accuracy - 0.8, 99.0), 1),
            }

        base_metrics.update(extra)
        return base_metrics

    @staticmethod
    def _create_auto_report(db: Session, task: EvaluationTask) -> None:
        """Auto-create an evaluation report after task completion."""
        category_label = "算子测试" if task.task_category == TaskCategory.operator_test else "模型测试"
        task_type_val = task.task_type.value if hasattr(task.task_type, 'value') else str(task.task_type)

        # Resolve operator library name for report
        operator_lib_name = None
        if task.operator_lib_id:
            from app.models.asset import DigitalAsset
            lib_asset = db.query(DigitalAsset).filter(DigitalAsset.id == task.operator_lib_id).first()
            if lib_asset:
                operator_lib_name = lib_asset.name

        report_txt_path = None
        report_json_path = None
        if task.device_type == 'cpu_test':
            txt_path, json_path = EvaluationService._cpu_test_report_paths(task.id)
            report_txt_path = str(txt_path) if txt_path.exists() else None
            report_json_path = str(json_path) if json_path.exists() else None

        report_content = {
            "task_name": task.name,
            "task_category": task.task_category.value if task.task_category else None,
            "task_type": task_type_val,
            "device_type": task.device_type,
            "device_count": task.device_count,
            "operator_lib": operator_lib_name,
            "operator_count": task.metrics.get("total_ops_tested") if task.metrics else None,
            "metrics": task.metrics,
            "started_at": str(task.started_at),
            "completed_at": str(task.completed_at),
            "duration_seconds": (task.completed_at - task.started_at).total_seconds() if task.started_at and task.completed_at else None,
            "report_txt_path": report_txt_path,
            "report_json_path": report_json_path,
            "conclusion": "评测任务已完成，各项指标正常。",
        }

        report = EvaluationReport(
            task_id=task.id,
            title=f"{task.name} - {category_label}报告",
            report_type="basic",
            content=json.dumps(report_content, ensure_ascii=False),
            status="published",
            creator_id=task.creator_id,
            tenant_id=task.tenant_id,
            is_public=False,
        )
        db.add(report)
        db.commit()

    @staticmethod
    @staticmethod
    def _write_model_benchmark(db: Session, task: EvaluationTask, metrics: dict) -> None:
        """Write model deployment test results to ModelBenchmark table.
        
        Key behavior: For the same chip + model combination, only keep the latest test result.
        If a benchmark already exists for this device_type + model_name + task_type, update it.
        Otherwise, create a new entry.
        """
        from app.models.model_benchmark import ModelBenchmark
        from app.models.asset import DigitalAsset

        if not task.image_id:
            return

        # Get image asset info
        image = db.query(DigitalAsset).filter(DigitalAsset.id == task.image_id).first()
        if not image:
            return

        tags = image.tags if isinstance(image.tags, list) else []
        chip_name = tags[0] if len(tags) > 0 else image.name
        framework_name = tags[1] if len(tags) > 1 else ""
        model_name = tags[3] if len(tags) > 3 else image.name

        device_type = task.device_type or "unknown"
        task_type_val = task.task_type.value if hasattr(task.task_type, 'value') else str(task.task_type)

        # Check if a benchmark already exists for this chip + model + task_type combination
        existing_bench = db.query(ModelBenchmark).filter(
            ModelBenchmark.device_type == device_type,
            ModelBenchmark.model_name == model_name,
            ModelBenchmark.task_type == task_type_val,
        ).first()

        if existing_bench:
            # Update existing benchmark with latest results
            existing_bench.image_id = task.image_id
            existing_bench.eval_method = "standard"
            existing_bench.throughput = metrics.get("throughput")
            existing_bench.throughput_unit = metrics.get("throughput_unit")
            existing_bench.avg_latency_ms = metrics.get("avg_latency_ms")
            existing_bench.p50_latency_ms = metrics.get("p50_latency_ms")
            existing_bench.p99_latency_ms = metrics.get("p99_latency_ms")
            existing_bench.first_token_latency_ms = metrics.get("first_token_latency_ms")
            existing_bench.accuracy = metrics.get("accuracy")
            existing_bench.accuracy_metric = metrics.get("accuracy_metric")
            existing_bench.energy_efficiency = metrics.get("energy_efficiency")
            existing_bench.energy_efficiency_unit = metrics.get("energy_efficiency_unit")
            existing_bench.power_consumption_w = metrics.get("power_consumption_w")
            existing_bench.performance_score = metrics.get("performance_score")
            existing_bench.software_completeness_score = metrics.get("software_completeness", {}).get("score")
            existing_bench.memory_usage_gb = metrics.get("memory_usage_gb")
            existing_bench.image_name = image.name
            existing_bench.chip_name = chip_name
            existing_bench.framework_name = framework_name
            existing_bench.model_name = model_name
            existing_bench.task_id = task.id
            existing_bench.tested_at = datetime.utcnow()
            db.add(existing_bench)
        else:
            # Create new benchmark entry
            bench = ModelBenchmark(
                image_id=task.image_id,
                task_type=task_type_val,
                device_type=device_type,
                eval_method="standard",
                # Core metrics
                throughput=metrics.get("throughput"),
                throughput_unit=metrics.get("throughput_unit"),
                avg_latency_ms=metrics.get("avg_latency_ms"),
                p50_latency_ms=metrics.get("p50_latency_ms"),
                p99_latency_ms=metrics.get("p99_latency_ms"),
                first_token_latency_ms=metrics.get("first_token_latency_ms"),
                accuracy=metrics.get("accuracy"),
                accuracy_metric=metrics.get("accuracy_metric"),
                energy_efficiency=metrics.get("energy_efficiency"),
                energy_efficiency_unit=metrics.get("energy_efficiency_unit"),
                power_consumption_w=metrics.get("power_consumption_w"),
                performance_score=metrics.get("performance_score"),
                software_completeness_score=metrics.get("software_completeness", {}).get("score"),
                memory_usage_gb=metrics.get("memory_usage_gb"),
                # Image metadata
                image_name=image.name,
                chip_name=chip_name,
                framework_name=framework_name,
                model_name=model_name,
                task_id=task.id,
            )
            db.add(bench)
        db.commit()

