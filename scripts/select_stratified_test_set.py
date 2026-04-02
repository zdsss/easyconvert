#!/usr/bin/env python3
"""
分层抽样选择测试集
"""
import json
import random
from pathlib import Path
from collections import defaultdict

INPUT_FILE = Path("test-resumes/parsing-difficulty-classification.json")
OUTPUT_FILE = Path("test-resumes/stratified-test-set.json")

def main():
    print("加载分类结果...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 按标签分组
    by_label = defaultdict(list)
    for item in data['classifications']:
        by_label[item['label']].append(item)

    print(f"共 {len(by_label)} 种标签")

    # 分层抽样
    test_set = []
    for label, items in by_label.items():
        count = len(items)
        if count >= 10:
            sample_size = 10
        elif count >= 5:
            sample_size = 5
        else:
            sample_size = count

        sampled = random.sample(items, sample_size)
        test_set.extend(sampled)
        print(f"{label}: {count}份 -> 抽取{sample_size}份")

    # 输出
    output = {
        "total": len(test_set),
        "test_set": test_set,
        "distribution": {label: len([t for t in test_set if t['label'] == label])
                        for label in by_label.keys()}
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n测试集已保存: {OUTPUT_FILE}")
    print(f"总计: {len(test_set)} 份")

if __name__ == "__main__":
    main()
