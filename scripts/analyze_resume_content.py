#!/usr/bin/env python3
"""基于EasyConvert解析结果分析简历内容结构"""

import requests
import json
from pathlib import Path
import time
import os
from dotenv import load_dotenv

load_dotenv()

API_BASE = "http://localhost:5173/api"

def parse_resume(file_path):
    """调用EasyConvert API解析简历"""
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
            response = requests.post(f"{API_BASE}/parse", files=files, timeout=30)

        if response.status_code == 200:
            return response.json()
        else:
            return {'error': f"API error: {response.status_code}"}
    except Exception as e:
        return {'error': str(e)}

def analyze_structure(parsed_data):
    """分析解析后的简历内容结构"""
    if 'error' in parsed_data:
        return {'error': parsed_data['error']}

    structure = {
        'modules': [],
        'has_photo': False,
        'has_charts': False,
        'layout_type': 'unknown',
        'module_complexity': {}
    }

    content = parsed_data.get('content', '')

    # 检测常见模块
    modules = {
        'personal_info': ['个人信息', '基本信息', '联系方式', '姓名', '电话', '邮箱'],
        'education': ['教育背景', '教育经历', '学历'],
        'work_experience': ['工作经历', '工作经验', '任职经历'],
        'project_experience': ['项目经验', '项目经历'],
        'skills': ['技能', '专业技能', '技术栈'],
        'certificates': ['证书', '资格证书', '荣誉'],
        'self_evaluation': ['自我评价', '个人评价', '自我介绍']
    }

    for module_type, keywords in modules.items():
        if any(kw in content for kw in keywords):
            structure['modules'].append(module_type)

    # 检测照片
    if '照片' in content or 'photo' in content.lower():
        structure['has_photo'] = True

    # 估算模块复杂度
    lines = content.split('\n')
    structure['total_lines'] = len(lines)
    structure['non_empty_lines'] = len([l for l in lines if l.strip()])

    return structure

def main():
    # 采样15份简历
    resume_dir = Path('/d/Program/tools/easyconvert/test-resumes/phase3-real-samples')
    all_resumes = list(resume_dir.glob('*.docx'))[:15]

    print(f"开始解析 {len(all_resumes)} 份采样简历...")
    print("注意: 请确保 EasyConvert 服务正在运行 (npm run dev)\n")

    results = []

    for i, resume_path in enumerate(all_resumes, 1):
        print(f"[{i}/{len(all_resumes)}] 解析: {resume_path.name}")

        parsed = parse_resume(resume_path)
        structure = analyze_structure(parsed)

        result = {
            'file': resume_path.name,
            'structure': structure,
            'raw_parse': parsed if 'error' not in parsed else {'error': parsed['error']}
        }
        results.append(result)

        time.sleep(1)  # 避免请求过快

    # 保存结果
    output_file = Path('/d/Program/tools/easyconvert/docs/content-structure-analysis.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✓ 分析完成！结果保存至: {output_file}")

    # 统计模块分布
    module_stats = {}
    for r in results:
        if 'error' not in r['structure']:
            for mod in r['structure']['modules']:
                module_stats[mod] = module_stats.get(mod, 0) + 1

    print("\n模块出现频率:")
    for mod, count in sorted(module_stats.items(), key=lambda x: -x[1]):
        print(f"  {mod}: {count}/{len(all_resumes)}")

if __name__ == '__main__':
    main()
