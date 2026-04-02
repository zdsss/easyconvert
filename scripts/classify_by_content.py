#!/usr/bin/env python3
"""基于简历内容结构进行分类"""

import requests
import json
from pathlib import Path
import time
from collections import Counter

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

def classify_resume(parsed_data):
    """基于内容结构分类"""
    if 'error' in parsed_data:
        return 'error'

    content = parsed_data.get('content', '')
    lines = [l.strip() for l in content.split('\n') if l.strip()]

    # 检测模块
    modules = []
    if any(k in content for k in ['个人信息', '基本信息', '姓名', '电话']):
        modules.append('personal')
    if any(k in content for k in ['教育背景', '教育经历', '学历']):
        modules.append('education')
    if any(k in content for k in ['工作经历', '工作经验']):
        modules.append('work')
    if any(k in content for k in ['项目经验', '项目经历']):
        modules.append('project')
    if any(k in content for k in ['技能', '专业技能']):
        modules.append('skills')
    if any(k in content for k in ['证书', '资格证书']):
        modules.append('cert')
    if any(k in content for k in ['自我评价', '个人评价']):
        modules.append('eval')

    # 分类逻辑
    module_count = len(modules)
    line_count = len(lines)

    if module_count <= 3:
        structure = 'simple'
    elif module_count <= 5:
        structure = 'standard'
    else:
        structure = 'complete'

    if line_count < 50:
        detail = 'brief'
    elif line_count < 150:
        detail = 'normal'
    else:
        detail = 'detailed'

    return f"{structure}-{detail}"

def main():
    resume_dir = Path('/d/Program/tools/easyconvert/test-resumes/phase3-real-samples')
    resumes = list(resume_dir.glob('*.docx'))

    print(f"开始分类 {len(resumes)} 份简历...")
    print("请确保 EasyConvert 服务运行中\n")

    results = []
    categories = Counter()

    for i, path in enumerate(resumes, 1):
        if i % 10 == 0:
            print(f"进度: {i}/{len(resumes)}")

        parsed = parse_resume(path)
        category = classify_resume(parsed)
        categories[category] += 1

        results.append({
            'file': path.name,
            'category': category,
            'content_preview': parsed.get('content', '')[:200] if 'error' not in parsed else None
        })

        time.sleep(0.5)

    output = Path('/d/Program/tools/easyconvert/docs/content-based-classification.json')
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✓ 分类完成: {output}")
    print("\n分类统计:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")

if __name__ == '__main__':
    main()
