#!/usr/bin/env python3
"""
重新分类简历：基于解析难度、内容完整度和特殊场景
"""
import os
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple
from collections import Counter
from docx import Document

# 配置
RESUMES_DIR = Path("test-resumes/phase3-real-samples")
OUTPUT_FILE = Path("test-resumes/parsing-difficulty-classification.json")

def assess_parsing_difficulty(text: str) -> str:
    """评估解析难度"""
    score = 0

    # 检测标准标题关键词
    standard_headers = ['个人信息', '基本信息', '工作经历', '工作经验', '教育背景', '教育经历',
                       '项目经验', '技能', '自我评价']
    header_count = sum(1 for h in standard_headers if h in text)
    if header_count >= 4:
        score -= 2  # 标准格式

    # 检测日期格式一致性
    date_patterns = [
        r'\d{4}[年.-]\d{1,2}',  # 2020-01, 2020.01, 2020年01月
        r'\d{4}/\d{1,2}',       # 2020/01
        r'\d{4}\.\d{1,2}',      # 2020.01
    ]
    date_formats = set()
    for pattern in date_patterns:
        if re.search(pattern, text):
            date_formats.add(pattern)
    if len(date_formats) > 2:
        score += 1  # 日期格式不统一

    # 检测特殊字符和中英混合
    special_chars = len(re.findall(r'[^\u4e00-\u9fa5a-zA-Z0-9\s\.,;:()（）、，。；：]', text))
    if special_chars > 50:
        score += 1

    # 检测中英混合程度
    chinese_count = len(re.findall(r'[\u4e00-\u9fa5]', text))
    english_count = len(re.findall(r'[a-zA-Z]', text))
    if chinese_count > 0 and english_count > 0:
        ratio = min(chinese_count, english_count) / max(chinese_count, english_count)
        if ratio > 0.3:
            score += 1  # 高度混合

    # 检测段落式无结构
    lines = text.split('\n')
    long_paragraphs = sum(1 for line in lines if len(line) > 100)
    if long_paragraphs > 5:
        score += 1

    # 判定难度
    if score <= -1:
        return "easy"
    elif score <= 1:
        return "standard"
    else:
        return "hard"

def assess_content_completeness(text: str) -> str:
    """评估内容完整度"""
    modules = []

    # 检测各个模块
    if any(k in text for k in ['个人信息', '基本信息', '姓名', '电话', '邮箱']):
        modules.append('basics')
    if any(k in text for k in ['工作经历', '工作经验', '任职']):
        modules.append('work')
    if any(k in text for k in ['教育背景', '教育经历', '学历']):
        modules.append('education')
    if any(k in text for k in ['技能', '专业技能', '技术栈']):
        modules.append('skills')
    if any(k in text for k in ['项目经验', '项目经历']):
        modules.append('projects')
    if any(k in text for k in ['证书', '资格证书', '认证']):
        modules.append('certificates')
    if any(k in text for k in ['自我评价', '个人评价', '简介']):
        modules.append('summary')
    if any(k in text for k in ['荣誉', '奖项', '获奖']):
        modules.append('honors')
    if any(k in text for k in ['语言', '外语']):
        modules.append('languages')

    count = len(modules)
    if count <= 4:
        return "basic"
    elif count <= 7:
        return "complete"
    else:
        return "rich"

def identify_scenario(text: str) -> str:
    """识别特殊场景"""
    # 应届生：无工作经历或仅实习
    work_keywords = ['工作经历', '工作经验', '任职经历']
    intern_keywords = ['实习', '实习生']
    has_work = any(k in text for k in work_keywords)
    has_intern = any(k in text for k in intern_keywords)

    if not has_work or (has_work and has_intern and '公司' not in text[:500]):
        return "fresh"

    # 技术岗：技能多且项目多
    tech_skills = ['Python', 'Java', 'JavaScript', 'Go', 'C++', 'Docker', 'Kubernetes',
                   'MySQL', 'Redis', 'React', 'Vue', 'Spring', 'Django']
    skill_count = sum(1 for skill in tech_skills if skill in text)
    project_count = text.count('项目')

    if skill_count >= 5 and project_count >= 2:
        return "tech"

    # 高管：工作经历多
    work_sections = len(re.findall(r'(公司|集团|企业).*?(职位|岗位|总监|经理|主管|VP|CEO|CTO|COO)', text))
    if work_sections >= 5:
        return "executive"

    return "general"

def extract_text_from_docx(file_path: Path) -> str:
    """从docx文件提取文本"""
    doc = Document(file_path)
    return '\n'.join([para.text for para in doc.paragraphs])

def classify_resume(file_path: Path) -> Dict:
    """分类单个简历"""
    try:
        if file_path.suffix == '.docx':
            text = extract_text_from_docx(file_path)
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()

        difficulty = assess_parsing_difficulty(text)
        completeness = assess_content_completeness(text)
        scenario = identify_scenario(text)

        label = f"{difficulty}-{completeness}-{scenario}"

        return {
            "file": file_path.name,
            "label": label,
            "difficulty": difficulty,
            "completeness": completeness,
            "scenario": scenario,
            "size": len(text)
        }
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def main():
    """主函数"""
    print("开始重新分类简历...")

    # 获取所有简历文件
    resume_files = list(RESUMES_DIR.glob("*.docx"))
    print(f"找到 {len(resume_files)} 份简历")

    # 分类
    classifications = []
    for i, file_path in enumerate(resume_files, 1):
        if i % 100 == 0:
            print(f"处理进度: {i}/{len(resume_files)}")

        result = classify_resume(file_path)
        if result:
            classifications.append(result)

    # 统计
    labels = [c['label'] for c in classifications]
    label_counts = Counter(labels)

    difficulty_counts = Counter(c['difficulty'] for c in classifications)
    completeness_counts = Counter(c['completeness'] for c in classifications)
    scenario_counts = Counter(c['scenario'] for c in classifications)

    # 输出结果
    output = {
        "total": len(classifications),
        "classifications": classifications,
        "statistics": {
            "by_label": dict(label_counts),
            "by_difficulty": dict(difficulty_counts),
            "by_completeness": dict(completeness_counts),
            "by_scenario": dict(scenario_counts)
        }
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n分类完成！结果保存到: {OUTPUT_FILE}")
    print(f"\n统计信息:")
    print(f"  难度分布: {dict(difficulty_counts)}")
    print(f"  完整度分布: {dict(completeness_counts)}")
    print(f"  场景分布: {dict(scenario_counts)}")
    print(f"  标签种类: {len(label_counts)}")

if __name__ == "__main__":
    main()
