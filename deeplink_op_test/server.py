from __future__ import annotations

import os
import platform
import socket
from typing import Any

from fastapi import FastAPI, Header, HTTPException

from main import run

app = FastAPI(title='deeplink_op_test agent')
AGENT_TOKEN = os.getenv('DEEPLINK_OP_TEST_TOKEN', '')
EXECUTOR_IP = os.getenv('DEEPLINK_EXECUTOR_IP', '10.201.6.32')
SUPPORTED_DEVICE = 'hygon_bw1000'
SUPPORTED_CATEGORY = '元素操作类'


def executor_info() -> dict[str, Any]:
    return {
        'host': socket.gethostname(),
        'ip': EXECUTOR_IP,
        'architecture': platform.machine(),
        'platform': platform.platform(),
        'role': 'bw1000_execution_server',
    }


@app.get('/health')
def health() -> dict[str, Any]:
    return {'status': 'ok', 'tool_name': 'deeplink_op_test', 'backend': 'pytorch_cpu', 'executor': executor_info()}


@app.post('/v1/evaluations/run')
def execute(payload: dict[str, Any], authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if AGENT_TOKEN and authorization != f'Bearer {AGENT_TOKEN}':
        raise HTTPException(status_code=401, detail='invalid runner token')
    if payload.get('tool_name') != 'deeplink_op_test':
        raise HTTPException(status_code=400, detail='当前测试不支持：tool_name 必须为 deeplink_op_test')
    device = payload.get('device') or payload.get('chip')
    if device != SUPPORTED_DEVICE:
        raise HTTPException(status_code=400, detail='当前测试不支持：仅支持 BW1000（hygon_bw1000）')
    category = payload.get('operator_category') or payload.get('category')
    if category != SUPPORTED_CATEGORY:
        raise HTTPException(status_code=400, detail='当前测试不支持：仅支持元素操作类')
    try:
        result = run(payload)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex)) from ex
    result['executor'] = executor_info()
    return result
