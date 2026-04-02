# 简历解析 Workflow 设计方案

## 1. 系统概述

### 1.1 设计理念

传统简历解析系统通常采用单一策略处理所有类型的简历，这导致：
- 简单简历浪费资源（过度处理）
- 复杂简历处理不足（资源不够）
- 无法针对不同结构优化准确率

本系统采用**分类驱动的智能处理**方法，核心优势：
- **解析前预判**：基于文件属性快速分类，避免盲目处理
- **解析后优化**：基于内容结构精准匹配策略
- **差异化资源分配**：9种策略自动适配不同场景
- **性能与准确率平衡**：简单文档快速处理，复杂文档深度解析

### 1.2 核心创新点

1. **双层分类系统**
   - 第一层：文件属性分类（大小、复杂度、图片密度）
   - 第二层：内容结构分类（模块数、详细度）

2. **9种差异化策略**
   - 每种策略独立配置：超时、温度、重试、验证级别
   - 自动匹配最优策略

3. **完整的容错机制**
   - 缓存失败不阻断流程
   - 验证失败标记但继续
   - 部分模块失败返回可用数据

## 2. 完整流程图

```
文件上传
  ↓
[阶段1] 文件哈希 (SHA-256)
  ↓
[阶段2] 缓存检查 (IndexedDB, 7天)
  ↓ (未命中)
[阶段3] 文件属性分类 (大小/复杂度/图片)
  ↓
[阶段4] 文本提取 (PDF.js/mammoth)
  ↓
[阶段5] 内容结构分类 (模块数/行数)
  ↓
[阶段6] 策略选择 (9种策略之一)
  ↓
[阶段7] LLM解析 (带超时和重试)
  ↓
[阶段8] 最终内容分类
  ↓
[阶段9] 3级验证 (basic/standard/strict)
  ↓
[阶段10] 缓存存储 (仅有效数据)
  ↓
[阶段11] 指标记录
  ↓
UI展示 + 可编辑
```

## 3. 双层分类系统详解

### 3.1 第一层：文件属性分类（解析前）

**实现文件**: `src/lib/classifier.ts`

#### 文件大小分类
- **tiny**: <60KB - 快速处理，最小资源
- **small**: 60-150KB - 标准处理
- **medium**: 150-500KB - 适中资源
- **large**: 500KB-2MB - 高资源分配
- **xlarge**: >2MB - 特殊处理策略

#### 复杂度评估
- **simple**: 段落<80 且 无表格 - 结构简单
- **standard**: 段落80-150 或 表格1-2个 - 标准结构
- **complex**: 段落>150 或 表格>2 或 图片>5 - 复杂结构

#### 图片密度
- **no**: 0张 - 纯文本
- **low**: 1-2张 - 少量图片
- **multi**: 3-10张 - 多图片
- **high**: >10张 - 高图片密度

### 3.2 第二层：内容结构分类（解析后）

**实现文件**: `src/lib/contentClassifier.ts`

#### 结构类型（基于模块数量）
- **simple**: ≤3个模块 - 基本信息为主
- **standard**: 4-5个模块 - 标准简历结构
- **complete**: ≥6个模块 - 内容丰富完整

#### 详细度（基于行数）
- **brief**: <50行 - 简洁精炼
- **normal**: 50-150行 - 适中详细
- **detailed**: >150行 - 详细完整

#### 9种分类组合
1. simple-brief
2. simple-normal
3. simple-detailed
4. standard-brief
5. standard-normal
6. standard-detailed
7. complete-brief
8. complete-normal
9. complete-detailed

## 4. 差异化解析策略

**实现文件**: `src/lib/parsingStrategy.ts`

### 策略配置对比表

| 分类 | 超时(秒) | 温度 | 重试 | 提示类型 | 验证级别 |
|------|---------|------|------|---------|---------|
| simple-brief | 5 | 0.3 | 1 | minimal | basic |
| simple-normal | 8 | 0.3 | 2 | standard | basic |
| simple-detailed | 10 | 0.5 | 2 | standard | standard |
| standard-brief | 8 | 0.3 | 2 | standard | standard |
| standard-normal | 10 | 0.5 | 2 | standard | standard |
| standard-detailed | 15 | 0.5 | 3 | comprehensive | strict |
| complete-brief | 10 | 0.5 | 2 | standard | standard |
| complete-normal | 15 | 0.5 | 3 | comprehensive | strict |
| complete-detailed | 20 | 0.7 | 3 | comprehensive | strict |

### 策略选择逻辑

```typescript
function getStrategy(classification: string): ParsingStrategy {
  return STRATEGIES[classification] || STRATEGIES['standard-normal'];
}
```

### 参数说明

- **超时**: LLM调用最大等待时间
- **温度**: 控制输出随机性（0.3=保守，0.7=创造性）
- **重试**: 失败后最大重试次数
- **提示类型**: minimal/standard/comprehensive
- **验证级别**: basic/standard/strict

## 5. 关键子系统

### 5.1 缓存系统

**实现文件**: `src/lib/cache.ts`

- **Key生成**: SHA-256文件哈希
- **存储**: IndexedDB
- **过期**: 7天自动清理
- **版本控制**: v1（支持未来升级）
- **容错**: 失败不中断主流程
- **策略**: 仅缓存验证通过的数据

### 5.2 验证系统

**实现文件**: `src/lib/validators.ts`

**三级验证**:
- **basic**: 必填字段（姓名、联系方式）
- **standard**: 完整性（工作/教育经历）
- **strict**: 格式验证（邮箱、电话、数组类型）

**输出**: 完整性评分（0-100）+ 详细错误信息

### 5.3 并发控制

**实现文件**: `src/lib/concurrency.ts`

- **库**: p-limit
- **并发数**: 2个任务
- **队列追踪**: 实时状态
- **速率限制**: 任务间延迟1秒

### 5.4 性能指标

**实现文件**: `src/lib/metrics.ts`

追踪指标:
- 成功率
- 缓存命中率
- 平均处理时间
- 实时更新

## 6. 错误处理和容错

**实现文件**: `src/lib/extractWithLLM.ts`

### 错误分类

- **TimeoutError**: 超时错误（可重试）
- **AbortError**: 用户取消（不重试）
- **网络错误**: 连接失败（可重试）
- **API错误**: 限流/认证（部分可重试）

### 重试机制

```typescript
// 可重试错误
if (error.name === 'TimeoutError' || isNetworkError(error)) {
  if (attempt < maxRetries) {
    return retry();
  }
}
// 不可重试错误
throw error;
```

### 容错设计

- 缓存失败 → 继续解析流程
- 验证失败 → 标记但不阻断
- 部分模块失败 → 返回可用数据

## 7. 批量处理流程

**实现文件**: `src/lib/batchProcessor.ts`

### 完整处理管道

```typescript
async function processBatch(files: File[], onProgress: ProgressCallback) {
  for (const file of files) {
    // 1. 文件哈希
    const hash = await hashFile(file);

    // 2. 缓存检查
    const cached = await getCached(hash);
    if (cached) {
      onProgress({ cached: true });
      continue;
    }

    // 3. 文本提取
    const text = await extractText(file);

    // 4. 内容分类
    const classification = classifyContent(text);

    // 5. 策略选择
    const strategy = getStrategy(classification);

    // 6. LLM解析
    const resume = await extractResume(text, strategy);

    // 7. 最终分类
    const finalClass = classifyContent(resume);

    // 8. 验证
    const validation = validate(resume, strategy.validationLevel);

    // 9. 缓存存储（仅有效数据）
    if (validation.isValid) {
      await setCache(hash, resume);
    }

    // 10. 指标记录
    recordMetrics({ success: true, cached: false });

    // 11. 进度回调
    onProgress({ completed: true });

    // 12. 速率限制
    await delay(1000);
  }
}
```

### 处理特点

- **顺序处理**: 避免API限流
- **缓存优先**: 跳过已处理文件
- **容错设计**: 单个失败不影响批次
- **进度追踪**: 实时反馈处理状态

## 8. 技术实现总结

### 核心文件清单

| 文件 | 功能 |
|------|------|
| `src/lib/classifier.ts` | 文件属性分类 |
| `src/lib/contentClassifier.ts` | 内容结构分类 |
| `src/lib/parsingStrategy.ts` | 策略配置 |
| `src/lib/batchProcessor.ts` | 批量处理 |
| `src/lib/extractWithLLM.ts` | LLM集成 |
| `src/lib/cache.ts` | 缓存系统 |
| `src/lib/validators.ts` | 验证系统 |
| `src/lib/concurrency.ts` | 并发控制 |
| `src/lib/metrics.ts` | 性能指标 |
| `src/lib/prompts.ts` | 提示词模板 |
| `src/types.ts` | 数据模型 |

### 数据流

```
File → Hash → Cache? → Extract → Classify → Strategy → LLM → Validate → Cache → UI
```

### 性能优化

1. **缓存优化**: 7天有效期，避免重复解析
2. **并发控制**: 限制2个并发，防止API限流
3. **策略匹配**: 简单文档5秒，复杂文档20秒
4. **容错设计**: 失败不阻断，部分成功可用

### 质量保证

1. **三级验证**: basic/standard/strict
2. **重试机制**: 最多3次重试
3. **错误分类**: 可重试/不可重试
4. **指标追踪**: 成功率、缓存命中率

---

**文档版本**: v1.0
**创建日期**: 2026-03-31
**状态**: 已实现
