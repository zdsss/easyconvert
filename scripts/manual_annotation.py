#!/usr/bin/env python3
"""
人工标注工具 - 用于验证和修正解析结果
"""
import json
from pathlib import Path

RESULTS_FILE = Path("test-results/stratified-test-results.json")
ANNOTATIONS_FILE = Path("test-results/manual-annotations.json")

def main():
    print("人工标注工具")
    print("此工具用于标注解析结果的准确性")
    print("\n请在实际测试后使用此工具进行人工验证")

if __name__ == "__main__":
    main()
