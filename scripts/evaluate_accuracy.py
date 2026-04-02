#!/usr/bin/env python3
"""准确率评估 - 对比标准答案评估字段级准确率"""

import json
import requests
from pathlib import Path

API_URL = "http://localhost:3000/api/parse"

def load_ground_truth():
    """加载标准答案"""
    gt_path = Path('test-resumes/ground-truth.json')
    if not gt_path.exists():
        print("❌ ground-truth.json 不存在")
        return []

    with open(gt_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def evaluate_field(predicted, expected, field_name):
    """评估单个字段"""
    if predicted == expected:
        return 1.0
    if not expected:
        return 0.0
    if not predicted:
        return 0.0

    # 模糊匹配
    if isinstance(expected, str) and isinstance(predicted, str):
        if expected.lower() in predicted.lower() or predicted.lower() in expected.lower():
            return 0.8

    return 0.0

def evaluate_resume(parsed, ground_truth):
    """评估单份简历"""
    scores = {}

    # 姓名
    scores['name'] = evaluate_field(
        parsed.get('basics', {}).get('name'),
        ground_truth['groundTruth']['basics'].get('name'),
        'name'
    )

    # 电话
    scores['phone'] = evaluate_field(
        parsed.get('basics', {}).get('phone'),
        ground_truth['groundTruth']['basics'].get('phone'),
        'phone'
    )

    # 邮箱
    scores['email'] = evaluate_field(
        parsed.get('basics', {}).get('email'),
        ground_truth['groundTruth']['basics'].get('email'),
        'email'
    )

    # 工作经历数量
    work_count = len(parsed.get('work', []))
    expected_work = ground_truth['groundTruth'].get('workCount', 0)
    scores['work_count'] = 1.0 if work_count == expected_work else max(0, 1 - abs(work_count - expected_work) * 0.2)

    # 教育背景数量
    edu_count = len(parsed.get('education', []))
    expected_edu = ground_truth['groundTruth'].get('educationCount', 0)
    scores['edu_count'] = 1.0 if edu_count == expected_edu else max(0, 1 - abs(edu_count - expected_edu) * 0.3)

    return scores

def run_evaluation():
    """运行评估"""
    print("=== EasyConvert 准确率评估 ===\n")

    ground_truths = load_ground_truth()
    if not ground_truths:
        return

    all_scores = []

    for gt in ground_truths:
        file_path = Path('test-resumes/phase3-real-samples') / gt['filename']
        print(f"评估: {gt['filename']}...", end=' ')

        try:
            with open(file_path, 'rb') as f:
                response = requests.post(API_URL, files={'file': f}, timeout=30)

                if response.status_code == 200:
                    parsed = response.json()
                    scores = evaluate_resume(parsed, gt)
                    all_scores.append(scores)
                    avg = sum(scores.values()) / len(scores)
                    print(f"✓ {avg*100:.1f}%")
                else:
                    print(f"✗ API 错误")
        except Exception as e:
            print(f"✗ {str(e)}")

    if all_scores:
        print(f"\n=== 总体准确率 ===")
        for field in ['name', 'phone', 'email', 'work_count', 'edu_count']:
            avg = sum(s[field] for s in all_scores) / len(all_scores)
            print(f"{field}: {avg*100:.1f}%")

if __name__ == '__main__':
    run_evaluation()
