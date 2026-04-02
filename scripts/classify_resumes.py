#!/usr/bin/env python3
"""简历分类脚本 - 基于文件大小、内容复杂度和图片密度进行分类"""

import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
import json
import sys

def analyze_resume(docx_path):
    """分析单个简历文件"""
    try:
        file_size = docx_path.stat().st_size

        with zipfile.ZipFile(docx_path, 'r') as docx:
            images = [f for f in docx.namelist() if f.startswith('word/media/')]
            doc_xml = docx.read('word/document.xml')
            root = ET.fromstring(doc_xml)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = len(root.findall('.//w:p', ns))
            tables = len(root.findall('.//w:tbl', ns))

        # 大小分类
        if file_size < 60000:
            size_cat = 'tiny'
        elif file_size < 150000:
            size_cat = 'small'
        elif file_size < 500000:
            size_cat = 'medium'
        elif file_size < 2000000:
            size_cat = 'large'
        else:
            size_cat = 'xlarge'

        # 复杂度分类
        if paragraphs < 80 and tables == 0:
            complexity = 'simple'
        elif paragraphs <= 150 and tables <= 2:
            complexity = 'standard'
        else:
            complexity = 'complex'

        # 图片密度分类
        img_count = len(images)
        if img_count == 0:
            image_cat = 'no'
        elif img_count <= 2:
            image_cat = 'low'
        elif img_count <= 10:
            image_cat = 'multi'
        else:
            image_cat = 'high'

        category = f"{size_cat}-{complexity}-{image_cat}"

        return {
            'file': docx_path.name,
            'size': file_size,
            'images': img_count,
            'paragraphs': paragraphs,
            'tables': tables,
            'category': category,
            'size_cat': size_cat,
            'complexity': complexity,
            'image_cat': image_cat
        }
    except Exception as e:
        return {
            'file': docx_path.name,
            'error': str(e),
            'category': 'error'
        }

def main():
    resume_dir = Path('D:/Program/tools/easyconvert/test-resumes/phase3-real-samples')
    resumes = list(resume_dir.glob('*.docx'))

    print(f"分析 {len(resumes)} 份简历...")

    results = []
    for i, resume in enumerate(resumes, 1):
        if i % 50 == 0:
            print(f"进度: {i}/{len(resumes)}")
        result = analyze_resume(resume)
        results.append(result)

    # 保存结果
    output_file = Path('D:/Program/tools/easyconvert/docs/resume-classification-results.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n分类完成！结果保存至: {output_file}")

    # 统计
    stats = {}
    for r in results:
        cat = r.get('category', 'error')
        stats[cat] = stats.get(cat, 0) + 1

    print("\n分类统计:")
    for cat in sorted(stats.keys()):
        print(f"  {cat}: {stats[cat]}")

if __name__ == '__main__':
    main()
