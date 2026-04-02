#!/usr/bin/env python3
"""基于内容分类的快速验证测试"""

import requests
import json
from pathlib import Path
import time

API_BASE = "http://localhost:5173/api"

def parse_resume(file_path):
    """解析简历"""
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
            response = requests.post(f"{API_BASE}/parse", files=files, timeout=30)
        return response.json() if response.status_code == 200 else {'error': response.status_code}
    except Exception as e:
        return {'error': str(e)}

def validate_modules(content):
    """验证模块识别"""
    modules = []
    if any(k in content for k in ['个人信息', '基本信息', '姓名']):
        modules.append('personal')
    if any(k in content for k in ['教育背景', '教育经历']):
        modules.append('education')
    if any(k in content for k in ['工作经历', '工作经验']):
        modules.append('work')
    if any(k in content for k in ['项目经验', '项目经历']):
        modules.append('project')
    return modules

def main():
    test_set_file = Path('/d/Program/tools/easyconvert/docs/content-based-test-set.json')

    if not test_set_file.exists():
        print("错误: 测试集不存在，请先运行 select_content_test_set.py")
        return

    with open(test_set_file, 'r', encoding='utf-8') as f:
        test_set = json.load(f)

    resume_dir = Path('/d/Program/tools/easyconvert/test-resumes/phase3-real-samples')

    print("开始快速验证测试...\n")

    results = []
    success = 0
    total = 0

    for category, files in test_set.items():
        print(f"测试类别: {category}")
        for filename in files[:1]:  # 快速测试每类取1份
            total += 1
            file_path = resume_dir / filename

            if not file_path.exists():
                print(f"  ✗ {filename} - 文件不存在")
                continue

            start = time.time()
            parsed = parse_resume(file_path)
            elapsed = time.time() - start

            if 'error' in parsed:
                print(f"  ✗ {filename} - 解析失败: {parsed['error']}")
                results.append({'file': filename, 'category': category, 'success': False})
            else:
                success += 1
                modules = validate_modules(parsed.get('content', ''))
                print(f"  ✓ {filename} - {elapsed:.2f}s - 模块: {len(modules)}")
                results.append({'file': filename, 'category': category, 'success': True, 'time': elapsed, 'modules': modules})

            time.sleep(0.5)

    print(f"\n测试完成: {success}/{total} ({success/total*100:.1f}%)")

    output = Path('/d/Program/tools/easyconvert/docs/quick-test-results.json')
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"结果已保存: {output}")

if __name__ == '__main__':
    main()
