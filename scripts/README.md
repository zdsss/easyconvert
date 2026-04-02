# EasyConvert Scripts

统一的 Python 脚本工具集，用于简历数据处理、分类和测试。

## 快速开始

所有脚本通过统一的 CLI 入口运行：

```bash
python scripts/cli.py <command> [options]
```

## 命令列表

### 1. 分类简历 (classify)

对简历文件进行分类，支持三种方法：

```bash
# 按解析难度分类（推荐）
python scripts/cli.py classify --method difficulty

# 按内容分类
python scripts/cli.py classify --method content

# 按文件特征分类
python scripts/cli.py classify --method file
```

### 2. 选择测试集 (select)

从分类结果中选择测试集：

```bash
# 分层抽样（推荐）
python scripts/cli.py select --strategy stratified --classification docs/classification.json

# 内容驱动选择
python scripts/cli.py select --strategy content --classification docs/classification.json

# 快速选择
python scripts/cli.py select --strategy quick --classification docs/classification.json
```

### 3. 运行测试 (test)

执行解析测试：

```bash
# 快速验证测试
python scripts/cli.py test --type quick

# 内容测试
python scripts/cli.py test --type content

# 批量测试
python scripts/cli.py test --type batch --test-set test-sets/stratified.json
```

### 4. 生成数据 (generate)

生成测试数据：

```bash
# 生成测试简历
python scripts/cli.py generate --type resumes

# 生成边界用例
python scripts/cli.py generate --type edge-cases
```

## 完整工作流

```bash
# 1. 生成测试数据
python scripts/cli.py generate --type resumes

# 2. 分类简历
python scripts/cli.py classify --method difficulty

# 3. 选择测试集
python scripts/cli.py select --strategy stratified --classification docs/resume_classification_difficulty.json

# 4. 运行测试
python scripts/cli.py test --type quick
```

## 活跃脚本

- `reclassify_by_parsing_difficulty.py` - 难度分类（主要）
- `classify_by_content.py` - 内容分类
- `select_stratified_test_set.py` - 分层抽样
- `test_content_quick.py` - 快速测试
- `generate_test_resumes.py` - 数据生成

## 废弃脚本

已移至 `scripts/DEPRECATED/` 目录：
- `classify_resumes.py` - 被难度分类替代
- `select_test_set.py` - 被分层抽样替代
- `test_quick_validation.py` - 被内容测试替代
