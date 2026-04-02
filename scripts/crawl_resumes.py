#!/usr/bin/env python3
"""
简历模板爬虫 - 从 jianlimoban-ziyuan.com 爬取简历样本
仅用于 EasyConvert 测试目的
"""

import os
import re
import time
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urljoin

# 配置
BASE_URL = "https://www.jianlimoban-ziyuan.com"
LIST_URL = f"{BASE_URL}/zhongwen/"
OUTPUT_DIR = Path("test-resumes/phase3-real-samples")
MAX_DOWNLOADS = 10000  # 限制下载数量（设置为一个大数）
REQUEST_DELAY = 2.5  # 请求间隔（秒）- 增加间隔避免被封
MAX_RETRIES = 3
MAX_PAGES = 150  # 最大页数

# HTTP 请求头
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": BASE_URL,
}


def fetch_page(url, retries=MAX_RETRIES):
    """获取页面内容"""
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.raise_for_status()
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            print(f"  ⚠️  请求失败 (尝试 {attempt + 1}/{retries}): {e}")
            if attempt < retries - 1:
                time.sleep(2)
    return None


def parse_detail_links(html):
    """从列表页解析详情页链接"""
    soup = BeautifulSoup(html, 'lxml')
    links = []

    # 查找 mb_list 容器中的简历链接
    mb_list = soup.find('div', class_='mb_list')
    if mb_list:
        for a in mb_list.find_all('a', href=True):
            href = a.get('href', '')
            if re.match(r'/zhongwen/\d+\.html', href):
                full_url = urljoin(BASE_URL, href)
                links.append(full_url)

    return list(set(links))  # 去重


def extract_code_from_detail(detail_url):
    """从详情页提取 code 参数"""
    html = fetch_page(detail_url)
    if not html:
        return None

    # 从 JavaScript 中提取 code
    # 格式: $.get("/download/fileUrl/",{"code":"ZW-00040"}
    match = re.search(r'"code"\s*:\s*"([A-Z]+-\d+)"', html)
    if match:
        return match.group(1)

    return None


def get_download_url(code):
    """通过 API 获取下载链接"""
    api_url = f"{BASE_URL}/download/fileUrl/?code={code}"

    try:
        response = requests.get(api_url, headers=HEADERS, timeout=10)
        data = response.json()

        if data.get('state') == 2 and data.get('data'):
            download_path = data['data']
            return urljoin(BASE_URL, download_path)
    except Exception as e:
        print(f"  ⚠️  获取下载链接失败: {e}")

    return None


def download_file(url, filepath):
    """下载文件到本地"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30, stream=True)
        response.raise_for_status()

        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        return True
    except Exception as e:
        print(f"  ❌ 下载失败: {e}")
        return False


def main():
    """主流程"""
    print("🚀 开始爬取简历模板...")
    print(f"📁 输出目录: {OUTPUT_DIR}")
    print(f"⚙️  配置: 最多 {MAX_DOWNLOADS} 份, 最多 {MAX_PAGES} 页, 间隔 {REQUEST_DELAY}s")

    # 创建输出目录
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    downloaded_count = 0
    skipped_count = 0
    failed_count = 0
    page = 1

    while downloaded_count < MAX_DOWNLOADS and page <= MAX_PAGES:
        # 构造列表页 URL
        if page == 1:
            list_url = LIST_URL
        else:
            list_url = f"{LIST_URL}?pageNumber={page}"

        print(f"\n📄 爬取第 {page} 页: {list_url}")
        html = fetch_page(list_url)

        if not html:
            print("  ⚠️  无法获取页面，停止爬取")
            break

        # 解析详情页链接
        detail_links = parse_detail_links(html)

        if not detail_links:
            print("  ℹ️  没有找到更多简历，爬取完成")
            break

        print(f"  ✓ 找到 {len(detail_links)} 个简历")

        # 处理每个详情页
        for detail_url in detail_links:
            if downloaded_count >= MAX_DOWNLOADS:
                break

            # 提取 code
            code = extract_code_from_detail(detail_url)
            if not code:
                print(f"  ⚠️  无法提取 code: {detail_url}")
                failed_count += 1
                continue

            # 检查是否已下载
            existing_files = list(OUTPUT_DIR.glob(f"*-{code}.docx"))
            if existing_files:
                print(f"  ⏭️  已存在: {code}")
                skipped_count += 1
                continue

            print(f"  📥 下载: {code}")

            # 获取下载链接
            download_url = get_download_url(code)
            if not download_url:
                print(f"  ⚠️  无法获取下载链接: {code}")
                failed_count += 1
                time.sleep(REQUEST_DELAY)
                continue

            # 下载文件
            filename = f"real-{downloaded_count + 1:03d}-{code}.docx"
            filepath = OUTPUT_DIR / filename

            if download_file(download_url, filepath):
                downloaded_count += 1
                print(f"  ✓ 成功 ({downloaded_count}/{MAX_DOWNLOADS}): {filename}")
            else:
                failed_count += 1

            # 延迟，避免请求过快
            time.sleep(REQUEST_DELAY)

        page += 1

    print(f"\n✅ 爬取完成！")
    print(f"📊 统计: 成功 {downloaded_count} 份, 跳过 {skipped_count} 份, 失败 {failed_count} 份")
    print(f"📁 文件保存在: {OUTPUT_DIR.absolute()}")


if __name__ == "__main__":
    main()
