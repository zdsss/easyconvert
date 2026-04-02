#!/usr/bin/env python3
"""
EasyConvert Scripts CLI - 统一的脚本入口
"""
import argparse
import sys
import subprocess
from pathlib import Path

def run_classify(args):
    """运行分类脚本"""
    if args.method == 'difficulty':
        cmd = ['python', 'scripts/reclassify_by_parsing_difficulty.py']
    elif args.method == 'content':
        cmd = ['python', 'scripts/classify_by_content.py']
    else:
        cmd = ['python', 'scripts/classify_resumes.py']
    subprocess.run(cmd)

def run_select(args):
    """运行测试集选择脚本"""
    if args.strategy == 'stratified':
        cmd = ['python', 'scripts/select_stratified_test_set.py', args.classification]
    elif args.strategy == 'content':
        cmd = ['python', 'scripts/select_content_test_set.py', args.classification]
    else:
        cmd = ['python', 'scripts/select_test_set.py', args.classification]
    if args.output:
        cmd.extend(['--output', args.output])
    subprocess.run(cmd)

def run_test(args):
    """运行测试脚本"""
    if args.type == 'content':
        cmd = ['python', 'scripts/test_content_quick.py']
    elif args.type == 'batch':
        cmd = ['python', 'scripts/batch_test.py']
    else:
        cmd = ['python', 'scripts/test_quick_validation.py']
    if args.test_set:
        cmd.append(args.test_set)
    subprocess.run(cmd)

def run_generate(args):
    """运行生成脚本"""
    if args.type == 'edge-cases':
        cmd = ['python', 'scripts/generate_edge_cases.py']
    else:
        cmd = ['python', 'scripts/generate_test_resumes.py']
    subprocess.run(cmd)

def main():
    parser = argparse.ArgumentParser(description='EasyConvert 脚本工具集')
    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    # 分类命令
    classify_parser = subparsers.add_parser('classify', help='分类简历')
    classify_parser.add_argument('--method', choices=['file', 'content', 'difficulty'],
                                default='difficulty', help='分类方法')
    classify_parser.add_argument('--input', default='test-resumes/', help='输入目录')
    classify_parser.add_argument('--output', default='docs/', help='输出目录')

    # 选择测试集命令
    select_parser = subparsers.add_parser('select', help='选择测试集')
    select_parser.add_argument('--strategy', choices=['quick', 'content', 'stratified'],
                               default='stratified', help='选择策略')
    select_parser.add_argument('--classification', required=True, help='分类文件路径')
    select_parser.add_argument('--output', help='输出文件路径')

    # 测试命令
    test_parser = subparsers.add_parser('test', help='运行测试')
    test_parser.add_argument('--type', choices=['quick', 'content', 'batch'],
                            default='quick', help='测试类型')
    test_parser.add_argument('--test-set', help='测试集文件路径')

    # 生成命令
    generate_parser = subparsers.add_parser('generate', help='生成测试数据')
    generate_parser.add_argument('--type', choices=['resumes', 'edge-cases'],
                                default='resumes', help='生成类型')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # 执行对应命令
    if args.command == 'classify':
        run_classify(args)
    elif args.command == 'select':
        run_select(args)
    elif args.command == 'test':
        run_test(args)
    elif args.command == 'generate':
        run_generate(args)

if __name__ == '__main__':
    main()
