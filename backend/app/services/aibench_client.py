"""
ProjectTen 管理节点 → AIBenchAgent 910B 执行节点的 HTTP 客户端。

调用方通过 submit_job() 提交任务，通过 poll_job() 轮询状态和结果。
任务到达 completed/failed/cancelled/timed_out 时 poll_job() 返回完整结果字典，
调用方负责写入 task.metrics / task.result 并更新 TaskStatus。

配置项（Settings）：
    AIBENCH_AGENT_URL        执行节点地址，如 http://10.201.21.35:8080
    AIBENCH_AGENT_TOKEN      预留鉴权 token（目前未强制）
    AIBENCH_POLL_INTERVAL_SECONDS   轮询间隔，默认 10 秒
    AIBENCH_POLL_TIMEOUT_SECONDS    总超时，默认 1800 秒

使用示例（evaluation_service.py 中调用）：
    from app.services.aibench_client import AIBenchClient
    client = AIBenchClient()
    job = client.submit_job(task)          # 返回 {"job_id": "...", "status": "queued"}
    result = client.poll_job(job["job_id"]) # 阻塞直到完成，返回完整结果
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

import requests

from app.config import settings

logger = logging.getLogger(__name__)

# ProjectTen TaskStatus → AIBenchAgent status 的进度映射
AGENT_TO_PROGRESS: Dict[str, int] = {
    "queued": 0,
    "preparing": 10,
    "starting_container": 25,
    "running": 45,
    "collecting": 85,
    "completed": 100,
    "failed": 100,
    "cancelled": 100,
    "timed_out": 100,
}

TERMINAL_STATUSES = {"completed", "failed", "cancelled", "timed_out"}


class AIBenchClientError(RuntimeError):
    """所有 AIBenchClient 错误的基类。"""
    pass


class JobSubmissionError(AIBenchClientError):
    pass


class JobNotFoundError(AIBenchClientError):
    pass


class JobPollTimeoutError(AIBenchClientError):
    pass


class AIBenchClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        poll_interval: Optional[int] = None,
        poll_timeout: Optional[int] = None,
    ):
        self.base_url = (base_url or settings.AIBENCH_AGENT_URL).rstrip("/")
        self.token = token or settings.AIBENCH_AGENT_TOKEN
        self.poll_interval = poll_interval or settings.AIBENCH_POLL_INTERVAL_SECONDS
        self.poll_timeout = poll_timeout or settings.AIBENCH_POLL_TIMEOUT_SECONDS
        if not self.base_url:
            raise AIBenchClientError(
                "AIBenchAgent URL 未配置。请在 .env 中设置 AIBENCH_AGENT_URL，"
                "或在部署时通过环境变量 AIBENCH_AGENT_URL 注入。"
            )
        self._session = requests.Session()
        if self.token:
            self._session.headers["Authorization"] = f"Bearer {self.token}"

    # ------------------------------------------------------------------
    # 公共 API
    # ------------------------------------------------------------------

    def submit_job(self, task: Any, image_name: str = None, extra_cfg: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        将 ProjectTen 任务提交给 AIBenchAgent 910B 执行节点。

        Args:
            task: EvaluationTask ORM 对象。
            image_name: 直接指定的镜像名（来自 assets.local.json 或 DB），优先级最高。
            extra_cfg: docker 额外参数 dict，包含 privileged/shm_size/extra_devices/extra_volumes/image_command 等。

        Returns:
            {"job_id": str, "external_task_id": str, "status": "queued", ...}
        """
        payload = self._build_payload(task, image_name=image_name, extra_cfg=extra_cfg or {})
        external_id = f"projectten-{task.id}"
        try:
            resp = self._post("/api/v1/jobs", json=payload)
            resp.raise_for_status()
            result = resp.json()
            logger.info(
                "[AIBenchClient] 任务 %s 已提交至 %s，job_id=%s",
                external_id,
                self.base_url,
                result.get("job_id"),
            )
            return result
        except requests.RequestException as exc:
            logger.warning(
                "[AIBenchClient] 任务 %s 提交失败（将回退为本地模拟）: %s",
                external_id,
                exc,
            )
            # 不抛异常，由调用方决定是否回退
            return {"job_id": None, "external_task_id": external_id, "status": "submit_failed"}

    def poll_job(self, job_id: str) -> Dict[str, Any]:
        """
        轮询 job_id 直到任务到达终态（completed / failed / cancelled / timed_out）。

        Returns:
            终态完整 JobView，包含 metrics/error/container/artifacts。
            抛出 JobPollTimeoutError 则到达总超时时间。
        """
        deadline = time.time() + self.poll_timeout
        while time.time() < deadline:
            try:
                resp = self._get(f"/api/v1/jobs/{job_id}")
                resp.raise_for_status()
                state = resp.json()
                status = state.get("status", "")

                if status in TERMINAL_STATUSES:
                    return state

                time.sleep(self.poll_interval)
            except requests.RequestException as exc:
                logger.warning("[AIBenchClient] 轮询 job %s 时出错: %s", job_id, exc)
                time.sleep(self.poll_interval)
        raise JobPollTimeoutError(
            f"AIBenchAgent job {job_id} 轮询超时（{self.poll_timeout}s）"
        )

    def cancel_job(self, job_id: str) -> Dict[str, Any]:
        """向执行节点发送取消请求。"""
        try:
            resp = self._post(f"/api/v1/jobs/{job_id}/cancel")
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            logger.warning("[AIBenchClient] 取消 job %s 失败: %s", job_id, exc)
            raise AIBenchClientError(f"取消任务失败: {exc}") from exc

    def get_logs(self, job_id: str) -> str:
        """获取容器日志（用于调试和错误展示）。"""
        try:
            resp = self._get(f"/api/v1/jobs/{job_id}/logs")
            resp.raise_for_status()
            return resp.json().get("logs", "")
        except requests.RequestException as exc:
            logger.warning("[AIBenchClient] 获取 job %s 日志失败: %s", job_id, exc)
            raise AIBenchClientError(f"获取日志失败: {exc}") from exc

    # ------------------------------------------------------------------
    # 内部工具
    # ------------------------------------------------------------------

    def _build_payload(self, task: Any, image_name: str = None, extra_cfg: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        将 ProjectTen EvaluationTask 映射为 AIBenchAgent JobRequest schema。

        image_name 和 extra_cfg 由调用方从 assets.local.json 直接传入，
        不依赖 task.config（避免 ORM session 刷新问题）。
        """
        extra_cfg = extra_cfg or {}
        task_config: Dict[str, Any] = {}
        if hasattr(task, "config"):
            v = task.config
            task_config = v if isinstance(v, dict) else {}

        raw_chip = str(task.device_type or "huawei_910b").lower().replace("-", "_")
        chip_map = {
            "huawei_910b": "Ascend_910B",
            "ascend910b": "Ascend_910B",
            "ascend_910b": "Ascend_910B",
        }
        chip = chip_map.get(raw_chip, "Ascend_910B")

        # image_name 优先用调用方传入的值，否则 fallback
        resolved_image_name = image_name or task_config.get("image_name", "REPLACE_WITH_ASCEND_MODEL_IMAGE")
        image_volumes = extra_cfg.get("image_volumes") or task_config.get("image_volumes", [])
        image_env = extra_cfg.get("image_environment") or task_config.get("image_environment", {})
        image_command = extra_cfg.get("image_command") or task_config.get(
            "image_command",
            "python3 /workspace/benchmark.py --output /workspace/results/result.json",
        )

        benchmark_cfg = task_config.get("benchmark", {})
        benchmark = {
            "warmup": benchmark_cfg.get("warmup", 3),
            "repeat": benchmark_cfg.get("repeat", 10),
            "concurrency": benchmark_cfg.get("concurrency", 1),
            "max_tokens": benchmark_cfg.get("max_tokens", 128),
        }

        resources = {
            "device_ids": list(range(getattr(task, "device_count", 1))),
            "gpus": None,
            "network_mode": "host",
            "ipc_mode": "host",
            "timeout_seconds": benchmark_cfg.get("timeout_seconds", settings.AIBENCH_POLL_TIMEOUT_SECONDS),
            "cleanup_container": True,
            "privileged": extra_cfg.get("privileged", False),
            "shm_size": extra_cfg.get("shm_size"),
            "extra_devices": extra_cfg.get("extra_devices", []),
            "extra_volumes": extra_cfg.get("extra_volumes", []),
        }

        payload = {
            "external_task_id": f"projectten-{task.id}",
            "task_type": "model_deployment",
            "scenario": getattr(task.task_type, "value", str(task.task_type))
            if hasattr(task, "task_type")
            else "llm",
            "chip": chip,
            "chip_count": getattr(task, "device_count", 1) or 1,
            "image": {
                "name": image_name,
                "command": image_command,
                "environment": image_env,
                "volumes": image_volumes,
            },
            "resources": resources,
            "benchmark": benchmark,
        }
        return payload

    # ------------------------------------------------------------------
    # HTTP 基础调用
    # ------------------------------------------------------------------

    def _get(self, path: str, **kwargs) -> requests.Response:
        return self._session.get(f"{self.base_url}{path}", timeout=30, **kwargs)

    def _post(self, path: str, **kwargs) -> requests.Response:
        return self._session.post(f"{self.base_url}{path}", timeout=60, **kwargs)
