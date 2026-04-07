# 简历标注规范

## 标注目的
为评估解析准确率提供标准答案，支持系统持续优化。

## 标注内容

### 1. 分类标签
格式：`difficulty-completeness-scenario`

- difficulty: easy/standard/hard
- completeness: basic/complete/rich
- scenario: fresh/tech/executive/general

示例：`standard-complete-tech`

### 2. 标准答案
提取关键字段的正确值：

```json
{
  "basics": {
    "name": "张三",
    "phone": "13800138000",
    "email": "zhangsan@example.com"
  },
  "workCount": 3,
  "educationCount": 2,
  "skillsCount": 8
}
```

### 3. 难点标注
记录解析难点，用于针对性优化：

- 多栏布局
- 表格格式
- 日期格式不统一
- 中英混合
- 特殊字符多

## 标注流程

1. 人工阅读简历
2. 确定分类标签
3. 提取关键字段标准答案
4. 标注解析难点
5. 通过评测系统录入标注数据（`/evaluation` 页面）

## 质量要求

- 姓名、联系方式必须准确
- 工作/教育经历数量准确
- 难点标注具体明确
