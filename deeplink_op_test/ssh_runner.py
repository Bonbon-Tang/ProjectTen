from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
from pathlib import Path
from typing import Any


DEFAULT_TARGET = os.getenv('DEEPLINK_OP_TEST_SSH_TARGET', 'root@10.201.21.35')
DEFAULT_REMOTE_PYTHON = os.getenv('DEEPLINK_OP_TEST_REMOTE_PYTHON', 'python3')
DEFAULT_TIMEOUT = int(os.getenv('DEEPLINK_OP_TEST_TIMEOUT', '300'))

REMOTE_BOOTSTRAP = """import json,sys
bundle=json.load(sys.stdin)
namespace={'__name__':'deeplink_remote'}
exec(compile(bundle['source'],'deeplink_op_test/main.py','exec'),namespace)
result=namespace['run'](bundle['payload'])
print(json.dumps(result,ensure_ascii=False))
"""


def build_command(target: str, remote_python: str, timeout: int) -> list[str]:
    remote_command = (
        f'flock -w 10 /tmp/deeplink_op_test.lock timeout {int(timeout)}s '
        f'{shlex.quote(remote_python)} -c {shlex.quote(REMOTE_BOOTSTRAP)}'
    )
    return [
        'ssh',
        '-o', 'BatchMode=yes',
        '-o', 'ConnectTimeout=10',
        '-o', 'ServerAliveInterval=15',
        '-o', 'ServerAliveCountMax=3',
        '-o', 'StrictHostKeyChecking=yes',
        target,
        remote_command,
    ]


def run_remote(
    payload: dict[str, Any],
    *,
    target: str = DEFAULT_TARGET,
    remote_python: str = DEFAULT_REMOTE_PYTHON,
    timeout: int = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    source = Path(__file__).with_name('main.py').read_text(encoding='utf-8')
    bundle = {'source': source, 'payload': payload}
    command = build_command(target, remote_python, timeout)
    try:
        completed = subprocess.run(
            command,
            input=json.dumps(bundle, ensure_ascii=False),
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
    result['transport'] = 'ssh_stream'
    result['ssh_target'] = target
    result['source_delivery'] = 'stdin'
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description='Stream and run deeplink_op_test on a remote SSH executor')
    parser.add_argument('--target', default=DEFAULT_TARGET)
    parser.add_argument('--remote-python', default=DEFAULT_REMOTE_PYTHON)
    parser.add_argument('--timeout', type=int, default=DEFAULT_TIMEOUT)
    args = parser.parse_args()
    try:
        payload = json.load(sys.stdin)
        result = run_remote(
            payload,
            target=args.target,
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
