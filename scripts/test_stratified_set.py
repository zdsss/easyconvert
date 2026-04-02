#!/usr/bin/env python3
"""
测试分层抽样的测试集
"""
import json
import sys
import asyncio
from pathlib import Path
from docx import Document

INPUT_FILE = Path("test-resumes/stratified-test-set.json")
RESUMES_DIR = Path("test-resumes/phase3-real-samples")
OUTPUT_FILE = Path("test-results/stratified-test-results.json")

def extract_text_from_docx(file_path: Path) -> str:
    """从docx文件提取文本"""
    doc = Document(file_path)
    return '\n'.join([para.text for para in doc.paragraphs])

def main():
    print("加载测试集...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"共 {data['total']} 份简历待测试")
    print("\n提示：此脚本需要通过Web界面运行解析")
    print("请启动应用并批量上传以下文件进行测试：")

    for item in data['test_set'][:10]:
        print(f"  - {item['file']} ({item['label']})")

    print(f"\n... 以及其他 {data['total'] - 10} 份")
    print(f"\n测试文件位置: {RESUMES_DIR}")

if __name__ == "__main__":
    main()
