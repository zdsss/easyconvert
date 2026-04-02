# EasyConvert 简历测试 Workflow 设计

## 概述

基于685份真实简历的分类结果，设计分层测试workflow，确保EasyConvert在各种场景下的稳定性和准确性。

## Workflow 架构

```
测试入口
  ├─ 快速验证层 (Quick Validation)
  ├─ 分类测试层 (Category Testing)
  ├─ 压力测试层 (Stress Testing)
  └─ 回归测试层 (Regression Testing)
```

## 1. 快速验证层 (Quick Validation)

**目标**：快速验证基本功能，5分钟内完成

**测试集**：从每个主要分类中抽取1份，共15份
- tiny-simple-low (1)
- tiny-standard-low (1)
- small-simple-low (1)
- small-standard-low (1)
- small-standard-multi (1)
- medium-simple-low (1)
- medium-standard-low (1)
- medium-standard-multi (1)
- medium-complex-low (1)
- large-simple-low (1)
- large-standard-low (1)
- large-standard-multi (1)
- large-complex-high (1)
- xlarge-standard-low (1)
- xlarge-complex-multi (1)

**验证节点**：
- ✓ 解析成功率 >= 90%
- ✓ 平均处理时间 < 3秒/份
- ✓ 无崩溃错误
- ✓ 基本字段提取完整（姓名、联系方式）

**实现方式**：
```python
# Hook: on_code_change
# Trigger: 当核心解析代码修改时自动运行
python scripts/test_quick_validation.py
```

## 2. 分类测试层 (Category Testing)

**目标**：验证各类型简历的处理效果，30分钟内完成

**测试策略**：分层抽样，共100份

| 大小类别 | 抽样数 | 复杂度分布 | 图片分布 |
|---------|-------|-----------|---------|
| tiny | 15 | simple:8, standard:6, complex:1 | low:10, multi:4, no:1 |
| small | 25 | simple:10, standard:13, complex:2 | low:18, multi:6, high:1 |
| medium | 30 | simple:12, standard:15, complex:3 | low:20, multi:8, high:2 |
| large | 20 | simple:8, standard:10, complex:2 | low:12, multi:6, high:2 |
| xlarge | 10 | simple:4, standard:5, complex:1 | low:6, multi:3, high:1 |

**验证节点**：
- ✓ 整体成功率 >= 95%
- ✓ 各分类成功率 >= 90%
- ✓ tiny/small 平均处理时间 < 2秒
- ✓ medium 平均处理时间 < 5秒
- ✓ large/xlarge 平均处理时间 < 10秒
- ✓ 字段提取准确率 >= 85%
- ✓ 内存使用 < 500MB

**实现方式**：
```bash
# 手动触发或定期运行
python scripts/test_category_sampling.py --sample-size 100
```

## 3. 压力测试层 (Stress Testing)

**目标**：验证系统在高负载下的稳定性，1-2小时完成

**测试场景**：
- 批量处理：连续处理500份简历
- 大文件处理：专门测试xlarge类型（>2MB）
- 复杂文件处理：专门测试complex类型
- 并发处理：多线程同时处理

**验证节点**：
- ✓ 批量处理成功率 >= 93%
- ✓ 无内存泄漏（内存增长 < 10%）
- ✓ 错误恢复机制有效
- ✓ 大文件处理不超时（< 30秒）
- ✓ 并发处理无死锁

**实现方式**：
```bash
# 定期运行（每周）
python scripts/test_stress.py --batch-size 500 --concurrent 4
```

## 4. 回归测试层 (Regression Testing)

**目标**：确保新版本不破坏已有功能

**测试集**：固定的50份代表性简历
- 覆盖所有主要分类
- 包含历史bug案例
- 包含边界情况

**验证节点**：
- ✓ 与基准版本对比，准确率不下降
- ✓ 处理时间不增加超过20%
- ✓ 已修复的bug不复现

**实现方式**：
```bash
# Hook: pre-release
# 发布前必须通过
python scripts/test_regression.py --baseline v1.0.0
```

## 5. 错误处理验证

**目标**：确保异常情况下的优雅降级

**测试场景**：
- 损坏的DOCX文件
- 空文件
- 超大文件（>20MB）
- 密码保护文件
- 特殊字符文件名

**验证节点**：
- ✓ 不崩溃，返回明确错误信息
- ✓ 错误日志完整
- ✓ 部分解析成功时返回可用数据

## 6. 性能基准测试

**基准指标**（基于分类统计）：

| 类别 | 目标处理时间 | 内存使用 |
|------|------------|---------|
| tiny | < 1秒 | < 50MB |
| small | < 2秒 | < 100MB |
| medium | < 5秒 | < 200MB |
| large | < 10秒 | < 400MB |
| xlarge | < 30秒 | < 800MB |

**验证节点**：
- ✓ 90%的简历在目标时间内完成
- ✓ 内存使用不超标
- ✓ CPU使用率合理（< 80%）

## 7. 自动化测试流程

### 开发阶段
```bash
# 每次代码提交前
git add .
python scripts/test_quick_validation.py  # 5分钟
# 通过后再提交
git commit -m "..."
```

### CI/CD 集成
```yaml
# .github/workflows/test.yml
on: [push, pull_request]
jobs:
  quick-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Quick Validation
        run: python scripts/test_quick_validation.py

  category-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Category Testing
        run: python scripts/test_category_sampling.py --sample-size 100
```

### 定期测试
- 每日：快速验证层（自动）
- 每周：分类测试层 + 压力测试层（自动）
- 发布前：全部测试层（手动触发）

## 8. 测试数据管理

### 测试集选择脚本
```python
# scripts/select_test_set.py
# 根据分类结果自动选择测试集
python scripts/select_test_set.py --type quick --output test-sets/quick.json
python scripts/select_test_set.py --type category --output test-sets/category.json
python scripts/select_test_set.py --type regression --output test-sets/regression.json
```

### 测试结果存储
```
test-results/
  ├── quick/
  │   ├── 2026-03-30-run1.json
  │   └── 2026-03-30-run2.json
  ├── category/
  ├── stress/
  └── regression/
```

## 9. 监控和报告

### 关键指标
- 成功率趋势
- 平均处理时间趋势
- 内存使用趋势
- 错误类型分布

### 报告格式
```json
{
  "test_type": "quick_validation",
  "timestamp": "2026-03-30T10:00:00Z",
  "total": 15,
  "success": 14,
  "failed": 1,
  "success_rate": 93.3,
  "avg_time": 2.1,
  "max_memory": 120,
  "errors": [
    {"file": "real-xxx.docx", "error": "corrupted zip"}
  ]
}
```

## 10. 实施优先级

### Phase 1（立即实施）
1. 创建快速验证测试集（15份）
2. 实现 test_quick_validation.py
3. 配置开发环境 hook

### Phase 2（1周内）
1. 创建分类测试集（100份）
2. 实现 test_category_sampling.py
3. 建立性能基准

### Phase 3（2周内）
1. 实现压力测试
2. 实现回归测试
3. 配置 CI/CD

### Phase 4（持续优化）
1. 收集测试数据
2. 优化测试策略
3. 更新基准指标
