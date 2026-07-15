from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
from typing import Any


DEFAULT_TARGET = os.getenv('DEEPLINK_OP_TEST_SSH_TARGET', 'bw1000-runner')
DEFAULT_REMOTE_DIR = os.getenv(
    'DEEPLINK_OP_TEST_REMOTE_DIR',
    '/data/tangyufeng/ProjectTen/deeplink_op_test',
)
DEFAULT_REMOTE_PYTHON = os.getenv(
    'DEEPLINK_OP_TEST_REMOTE_PYTHON',
    '.venv/bin/python',
)
DEFAULT_TIMEOUT = int(os.getenv('DEEPLINK_OP_TEST_TIMEOUT', '300'))


def build_command(target: str, remote_dir: str, remote_python: str, timeout: int) -> list[str]:
    remote_command = ' && '.join([
        f'cd {shlex.quote(remote_dir)}',
        f'flock -w 10 /tmp/deeplink_op_test.lock timeout {int(timeout)}s '
        f'{shlex.quote(remote_python)} main.py /dev/stdin',
    ])
    return [
        'ssh',
        '-o', 'BatchMode=yes',
        '-o', 'ConnectTimeout=10',
        '-o', 'ServerAliveInterval=15',
        '-o', 'ServerAliveCountMax=3',
        '-o', 'StrictHostKeyChecking=yes',
        target,
        f'bash -lc {shlex.quote(remote_command)}',
    ]


def run_remote(
    payload: dict[str, Any],
    *,
    target: str = DEFAULT_TARGET,
    remote_dir: str = DEFAULT_REMOTE_DIR,
    remote_python: str = DEFAULT_REMOTE_PYTHON,
    timeout: int = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    command = build_command(target, remote_dir, remote_python, timeout)
    try:
        completed = subprocess.run(
            command,
            input=json.dumps(payload, ensure_ascii=False),
            capture_output=True,
            text=True,
            timeout=timeout + 30,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f'SSH deeplink_op_test timed out after {timeout} seconds') from exc
    except OSError as exc:
        raise RuntimeError(f'failed to start ssh: {exc}') from exc

    if completed.returncode != 0:
        stderr = completed.stderr.strip()
        raise RuntimeError(
            f'SSH deeplink_op_test failed with exit code {completed.returncode}: '
            f'{stderr or "no stderr"}'
        )
    try:
        result = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f'SSH deeplink_op_test returned invalid JSON: {completed.stdout[-1000:]}'
        ) from exc
    if not isinstance(result, dict):
        raise RuntimeError('SSH deeplink_op_test returned a non-object JSON result')
    result['transport'] = 'ssh'
    result['ssh_target'] = target
    result['remote_dir'] = remote_dir
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description='Run deeplink_op_test on a remote SSH executor')
    parser.add_argument('--target', default=DEFAULT_TARGET)
    parser.add_argument('--remote-dir', default=DEFAULT_REMOTE_DIR)
    parser.add_argument('--remote-python', default=DEFAULT_REMOTE_PYTHON)
    parser.add_argument('--timeout', type=int, default=DEFAULT_TIMEOUT)
    args = parser.parse_args()
    try:
        payload = json.load(sys.stdin)
        result = run_remote(
            payload,
            target=args.target,
            remote_dir=args.remote_dir,
            remote_python=args.remote_python,
            timeout=args.timeout,
        )
    except Exception as exc:
        print(json.dumps({'status': 'failed', 'error': str(exc)}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
