#!/usr/bin/env python3
"""快速验证测试 - 通过 API 验证解析功能"""

import json
import time
import requests
from pathlib import Path

API_URL = "http://localhost:3000/api/parse"

def load_test_set():
    """加载分层测试集的代表性样本"""
    test_set_path = Path('test-resumes/stratified-test-set.json')

    if not test_set_path.exists():
        print("❌ 测试集不存在")
        return []

    with open(test_set_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 选取 12 份代表性简历
    samples = []
    for category in ['easy-basic', 'easy-complete', 'standard-complete', 'standard-rich', 'hard-complete', 'hard-rich']:
        items = [item for item in data if item.get('category') == category]
        if items:
            samples.append(items[0])

    return samples[:12]

def validate_result(result):
    """验证解析结果"""
    issues = []

    if not result.get('basics', {}).get('name'):
        issues.append('缺少姓名')
    if not result.get('basics', {}).get('phone') and not result.get('basics', {}).get('email'):
        issues.append('缺少联系方式')

    work = result.get('work', [])
    if not isinstance(work, list):
        issues.append('work 不是数组')

    education = result.get('education', [])
    if not isinstance(education, list):
        issues.append('education 不是数组')

    return len(issues) == 0, issues

def run_quick_validation():
    """运行快速验证测试"""
    print("=== EasyConvert 快速验证测试 ===")

    test_set = load_test_set()
    if not test_set:
        print("❌ 无法加载测试集")
        return

    print(f"✓ 加载测试集: {len(test_set)} 份简历\n")

    results = {
        'total': len(test_set),
        'success': 0,
        'failed': 0,
        'times': [],
        'by_category': {}
    }

    for i, item in enumerate(test_set, 1):
        file_path = Path('test-resumes/phase3-real-samples') / item['file']
        category = item.get('category', 'unknown')

        print(f"[{i}/{len(test_set)}] {item['file']} ({category})...", end=' ')

        try:
            with open(file_path, 'rb') as f:
                start = time.time()
                response = requests.post(API_URL, files={'file': f}, timeout=30)
                elapsed = time.time() - start

                if response.status_code == 200:
                    result = response.json()
                    is_valid, issues = validate_result(result)

                    if is_valid:
                        results['success'] += 1
                        results['times'].append(elapsed)
                        results['by_category'][category] = results['by_category'].get(category, {'success': 0, 'total': 0})
                        results['by_category'][category]['success'] += 1
                        results['by_category'][category]['total'] += 1
                        print(f"✓ {elapsed:.1f}s")
                    else:
                        results['failed'] += 1
                        print(f"✗ 验证失败: {', '.join(issues)}")
                else:
                    results['failed'] += 1
                    print(f"✗ API 错误: {response.status_code}")
        except Exception as e:
            results['failed'] += 1
            print(f"✗ {str(e)}")

    # 统计
    print(f"\n结果统计:")
    print(f"- 成功: {results['success']}/{results['total']} ({results['success']/results['total']*100:.1f}%)")
    print(f"- 失败: {results['failed']}/{results['total']}")

    if results['times']:
        print(f"- 平均时间: {sum(results['times'])/len(results['times']):.1f}s")

    print(f"\n分类准确率:")
    for cat, stats in results['by_category'].items():
        print(f"- {cat}: {stats['success']}/{stats['total']} ({stats['success']/stats['total']*100:.1f}%)")

if __name__ == '__main__':
    run_quick_validation()
