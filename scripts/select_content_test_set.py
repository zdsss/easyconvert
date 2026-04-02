#!/usr/bin/env python3
"""基于内容分类选择测试集"""

import json
from pathlib import Path
from collections import defaultdict
import random

def select_test_set(classification_file, samples_per_category=3):
    """从每个类别选择代表性样本"""

    with open(classification_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 按类别分组
    by_category = defaultdict(list)
    for item in data:
        if item['category'] != 'error':
            by_category[item['category']].append(item['file'])

    # 从每个类别选择样本
    test_set = {}
    for category, files in sorted(by_category.items()):
        count = min(samples_per_category, len(files))
        selected = random.sample(files, count) if len(files) > count else files
        test_set[category] = selected

    return test_set, by_category

def main():
    classification_file = Path('/d/Program/tools/easyconvert/docs/content-based-classification.json')

    if not classification_file.exists():
        print("错误: 请先运行 classify_by_content.py")
        return

    test_set, all_categories = select_test_set(classification_file)

    # 保存测试集
    output = Path('/d/Program/tools/easyconvert/docs/content-based-test-set.json')
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(test_set, f, ensure_ascii=False, indent=2)

    print(f"✓ 测试集已生成: {output}\n")
    print("测试集统计:")
    total = 0
    for category in sorted(test_set.keys()):
        count = len(test_set[category])
        total += count
        print(f"  {category}: {count} 份 (总共 {len(all_categories[category])} 份)")
    print(f"\n总计: {total} 份测试简历")

if __name__ == '__main__':
    main()
