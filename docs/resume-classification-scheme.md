# 简历分类方案

## 数据集概况
- 总数：585份 DOCX 格式简历
- 文件大小范围：10KB - 23MB
- 平均大小：633KB
- 中位数：126KB

## 分类维度

### 1. 文件大小分类（基于存储和处理复杂度）

| 类别 | 大小范围 | 数量估算 | 特征 |
|------|---------|---------|------|
| 微型 (tiny) | < 60KB | ~135 (25%) | 简单文本，少量图片 |
| 小型 (small) | 60-150KB | ~135 (25%) | 标准简历，1-2张图片 |
| 中型 (medium) | 150-500KB | ~225 (42%) | 多图片或复杂格式 |
| 大型 (large) | 500KB-2MB | ~70 (13%) | 大量图片或作品集 |
| 超大型 (xlarge) | > 2MB | ~20 (3%) | 高分辨率图片或多页作品 |

### 2. 内容复杂度分类（基于结构分析）

| 类别 | 特征 | 采样观察 |
|------|------|---------|
| 简单型 (simple) | 纯文本或少量格式，段落<80，无表格 | 常见于小文件 |
| 标准型 (standard) | 段落80-150，图片1-3张，可能有表格 | 最常见类型 |
| 复杂型 (complex) | 段落>150或表格>2或图片>5 | 需要更多处理资源 |

### 3. 图片密度分类

| 类别 | 图片数量 | 用途 |
|------|---------|------|
| 无图 (no-image) | 0 | 纯文本简历 |
| 低图 (low-image) | 1-2 | 标准简历（头像+logo） |
| 多图 (multi-image) | 3-10 | 设计类简历 |
| 高图 (high-image) | >10 | 作品集类简历 |

## 分类规则

采用多维度标签系统，每份简历标记为：`{size}-{complexity}-{image}`

示例：
- `small-simple-low` - 小型简单低图简历
- `medium-standard-multi` - 中型标准多图简历
- `large-complex-high` - 大型复杂高图简历

## 采样分析结果

| 文件名 | 大小 | 图片 | 段落 | 表格 | 分类 |
|--------|------|------|------|------|------|
| real-427-SYY-00015.docx | 28KB | 1 | 40 | 0 | tiny-simple-low |
| real-457-ZWSY-00076.docx | 61KB | 1 | 71 | 0 | small-simple-low |
| real-038-HH-836.docx | 64KB | 1 | 105 | 0 | small-standard-low |
| real-440-HH-934.docx | 130KB | 1 | 109 | 0 | small-standard-low |
| real-187-LY-0085.docx | 59KB | 3 | 127 | 0 | small-standard-multi |
| real-550-BYDS-000327.docx | 57KB | 1 | 66 | 0 | small-simple-low |
| real-121-SYY-00060.docx | 64KB | 1 | 55 | 0 | small-simple-low |
| real-472-SEZT-000106.docx | 137KB | 2 | 251 | 0 | small-complex-low |
| real-142-JYDY-000261.docx | 169KB | 25 | 55 | 6 | medium-complex-high |
| real-548-HH-1015.docx | 282KB | 1 | 77 | 0 | medium-simple-low |
| real-015-DXS-0028.docx | 291KB | 21 | 19 | 0 | medium-simple-high |
| real-223-BYDS-000251.docx | 388KB | 4 | 132 | 0 | medium-standard-multi |
| real-037-DXS-0020.docx | 968KB | 3 | 39 | 0 | large-simple-multi |
| real-065-SEZT-000112.docx | 1.1MB | 0 | 72 | 1 | large-simple-no |
| real-243-HH-631.docx | 1.7MB | 5 | 99 | 0 | large-standard-multi |

## 关键发现

1. **文件大小与内容复杂度不完全相关**：大文件可能是高分辨率图片导致，而非内容复杂
2. **图片是主要的文件大小驱动因素**：多图简历通常文件更大
3. **段落数量分布广泛**：从19到251不等，反映不同简历风格
4. **表格使用较少**：大多数简历不使用表格布局
5. **标准简历占主导**：1-3张图片、80-150段落的简历最常见
