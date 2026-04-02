#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量测试简历解析
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.resume_parser import ResumeParser

def batch_test(test_dir):
    """批量测试指定目录下的所有简历"""
    parser = ResumeParser()

    docx_files = list(Path(test_dir).glob('*.docx'))

    print(f"找到 {len(docx_files)} 份简历")
    print("=" * 60)

    results = []

    for file_path in docx_files:
        print(f"\n测试: {file_path.name}")
        try:
            result = parser.parse(str(file_path))
            results.append({
                'file': file_path.name,
                'success': True,
                'data': result
            })
            print(f"✓ 解析成功")
            print(f"  姓名: {result.get('name', 'N/A')}")
            print(f"  邮箱: {result.get('email', 'N/A')}")
            print(f"  电话: {result.get('phone', 'N/A')}")
            print(f"  工作经历: {len(result.get('work_experience', []))} 条")
            print(f"  教育背景: {len(result.get('education', []))} 条")
        except Exception as e:
            results.append({
                'file': file_path.name,
                'success': False,
                'error': str(e)
            })
            print(f"✗ 解析失败: {e}")

    print("\n" + "=" * 60)
    success_count = sum(1 for r in results if r['success'])
    print(f"总计: {len(results)} 份，成功: {success_count}，失败: {len(results) - success_count}")

    return results


if __name__ == '__main__':
    if len(sys.argv) > 1:
        test_dir = sys.argv[1]
    else:
        test_dir = 'test-resumes/phase1-core'

    batch_test(test_dir)
