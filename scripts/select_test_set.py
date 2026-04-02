#!/usr/bin/env python3
"""测试集选择工具 - 根据分类结果自动选择测试样本"""

import json
import random
from pathlib import Path
from collections import defaultdict

def load_classification_results():
    """加载分类结果"""
    with open('docs/resume-classification-results.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def select_quick_test_set(results):
    """选择快速验证测试集（15份）"""
    target_categories = [
        'tiny-simple-low', 'tiny-standard-low',
        'small-simple-low', 'small-standard-low', 'small-standard-multi',
        'medium-simple-low', 'medium-standard-low', 'medium-standard-multi', 'medium-complex-low',
        'large-simple-low', 'large-standard-low', 'large-standard-multi', 'large-complex-high',
        'xlarge-standard-low', 'xlarge-complex-multi'
    ]

    by_category = defaultdict(list)
    for r in results:
        if 'error' not in r:
            by_category[r['category']].append(r)

    selected = []
    for cat in target_categories:
        if cat in by_category and by_category[cat]:
            selected.append(random.choice(by_category[cat]))

    return selected

def select_category_test_set(results, total=100):
    """选择分类测试集（100份）"""
    by_size = defaultdict(list)
    for r in results:
        if 'error' not in r:
            by_size[r['size_cat']].append(r)

    quotas = {'tiny': 15, 'small': 25, 'medium': 30, 'large': 20, 'xlarge': 10}
    selected = []

    for size_cat, quota in quotas.items():
        if size_cat in by_size:
            samples = random.sample(by_size[size_cat], min(quota, len(by_size[size_cat])))
            selected.extend(samples)

    return selected

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--type', choices=['quick', 'category'], required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    results = load_classification_results()

    if args.type == 'quick':
        selected = select_quick_test_set(results)
    else:
        selected = select_category_test_set(results)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(selected, f, ensure_ascii=False, indent=2)

    print(f"已选择 {len(selected)} 份简历，保存至: {output_path}")

if __name__ == '__main__':
    main()
