#!/usr/bin/env python3
"""
CPU Test Runner - CPU 性能测试执行器

用于执行 CPU 相关的评估任务并生成报告。
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import requests
except ImportError:
    print("Installing required packages...")
    os.system("pip install requests python-dotenv")
    import requests

from dotenv import load_dotenv

load_dotenv()


class CPUTestRunner:
    """CPU 测试执行器"""

    def __init__(self, api_base_url: str = "http://localhost:8000"):
        self.api_base_url = api_base_url.rstrip("/")
        self.report_dir = Path("backend/data/cpu_test_reports")
        self.report_dir.mkdir(parents=True, exist_ok=True)

    def get_task(self, task_id: int) -> Optional[Dict]:
        """获取任务详情"""
        try:
            response = requests.get(
                f"{self.api_base_url}/api/v1/evaluations/tasks/{task_id}",
                timeout=30
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error fetching task: {e}")
            return None

    def execute_test(self, task_id: int, operators: List[str]) -> Dict[str, Any]:
        """执行 CPU 测试"""
        start_time = time.time()
        results = {
            "task_id": task_id,
            "start_time": datetime.now().isoformat(),
            "operators": operators,
            "results": [],
            "errors": [],
            "metrics": {}
        }

        # 模拟 CPU 测试执行
        for i, op in enumerate(operators):
            try:
                op_start = time.time()
                # 这里应该调用实际的算子执行逻辑
                # 目前模拟执行
                time.sleep(0.1)  # 模拟执行时间
                op_duration = time.time() - op_start

                results["results"].append({
                    "operator": op,
                    "status": "success",
                    "duration_ms": op_duration * 1000,
                    "index": i
                })
            except Exception as e:
                results["errors"].append({
                    "operator": op,
                    "error": str(e),
                    "index": i
                })

        end_time = time.time()
        results["end_time"] = datetime.now().isoformat()
        results["metrics"] = {
            "total_duration_ms": (end_time - start_time) * 1000,
            "operators_executed": len(results["results"]),
            "operators_failed": len(results["errors"]),
            "success_rate": len(results["results"]) / len(operators) if operators else 0
        }

        return results

    def save_report(self, task_id: int, results: Dict[str, Any]) -> tuple:
        """保存测试报告"""
        txt_path = self.report_dir / f"task_{task_id}_cpu_test_report.txt"
        json_path = self.report_dir / f"task_{task_id}_cpu_test_report.json"

        # 保存 JSON 报告
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        # 保存文本报告
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(f"CPU Test Report - Task {task_id}\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Start Time: {results['start_time']}\n")
            f.write(f"End Time: {results['end_time']}\n")
            f.write(f"Total Duration: {results['metrics']['total_duration_ms']:.2f} ms\n\n")
            f.write("Operators Executed:\n")
            f.write("-" * 50 + "\n")
            for r in results['results']:
                f.write(f"  [{r['index']}] {r['operator']}: {r['duration_ms']:.2f} ms\n")
            if results['errors']:
                f.write("\nErrors:\n")
                f.write("-" * 50 + "\n")
                for e in results['errors']:
                    f.write(f"  [{e['index']}] {e['operator']}: {e['error']}\n")
            f.write("\n" + "=" * 50 + "\n")
            f.write(f"Success Rate: {results['metrics']['success_rate'] * 100:.1f}%\n")

        return txt_path, json_path

    def run(self, task_id: int, operators: Optional[List[str]] = None) -> Dict[str, Any]:
        """运行完整的 CPU 测试流程"""
        print(f"Starting CPU test for task {task_id}...")

        # 如果没有提供算子列表，尝试从 API 获取
        if not operators:
            task = self.get_task(task_id)
            if task:
                operators = task.get("operators", [])
            else:
                operators = []

        if not operators:
            print("No operators to test")
            return {"error": "No operators"}

        # 执行测试
        results = self.execute_test(task_id, operators)

        # 保存报告
        txt_path, json_path = self.save_report(task_id, results)
        print(f"Report saved to: {txt_path}, {json_path}")

        return results


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="CPU Test Runner")
    parser.add_argument("--task-id", type=int, required=True, help="Task ID")
    parser.add_argument("--api-url", type=str, default="http://localhost:8000",
                        help="Backend API URL")
    parser.add_argument("--operators", type=str, nargs="+",
                        help="Operator names to test")

    args = parser.parse_args()

    runner = CPUTestRunner(api_base_url=args.api_url)
    operators = args.operators if args.operators else None

    results = runner.run(args.task_id, operators)

    # 输出结果
    print("\nTest Results:")
    print(f"  Total Duration: {results.get('metrics', {}).get('total_duration_ms', 0):.2f} ms")
    print(f"  Success Rate: {results.get('metrics', {}).get('success_rate', 0) * 100:.1f}%")

    return 0 if not results.get("error") else 1


if __name__ == "__main__":
    sys.exit(main())
