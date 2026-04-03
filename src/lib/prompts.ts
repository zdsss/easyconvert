import { promptEngine } from './prompts/promptEngine';

export type PromptType = 'basic' | 'standard' | 'comprehensive';
export type Scenario = 'fresh' | 'tech' | 'executive' | 'general';

export function getPrompt(type: PromptType, scenario: Scenario = 'general', schema?: string): string {
  try {
    return promptEngine.buildPrompt(type, scenario, schema);
  } catch (error) {
    return getFallbackPrompt(type, scenario);
  }
}

function getFallbackPrompt(type: PromptType, scenario: Scenario): string {
  const PROMPTS = {
    basic: `提取简历基本信息：
1. 个人信息：姓名、电话、邮箱
2. 工作经历：公司、职位、时间段
3. 教育背景：学校、学位、专业、时间段

对每个字段，同时返回一个 _confidence 值（0-1 浮点数），表示提取置信度。
例如：{ "basics": { "name": "张三", "name_confidence": 0.95, "email": "a@b.com", "email_confidence": 0.8 } }

返回JSON格式，字段名使用英文。`,

    standard: `提取完整简历信息：

必填字段：
- basics: {name, phone, email, title?}
- work: [{company, position, startDate, endDate, responsibilities[]}]
- education: [{school, degree, major, startDate, endDate}]

可选字段：
- skills: [string]
- projects: [{name, role, description, startDate, endDate}]

规则：
1. 日期统一格式：YYYY-MM 或 YYYY
2. responsibilities为数组，每条单独提取
3. 遇到逗号/顿号必须拆分

对每个字段，同时返回一个 _confidence 值（0-1 浮点数），表示提取置信度。
例如：{ "basics": { "name": "张三", "name_confidence": 0.95, "email": "a@b.com", "email_confidence": 0.8 } }

返回标准JSON。`,

    comprehensive: `深度提取简历信息，严格遵循以下规则：

## 1. 基本信息
- 姓名：必填
- 联系方式：电话、邮箱至少一项
- 职位意向：如有则提取

## 2. 工作经历（关键）
每段经历必须包含：
- company, position, startDate, endDate
- responsibilities: 职责描述数组
- achievements: 业绩成果数组

**拆分规则**：
- 看到数字/百分比/量词（亿万千百%级+倍） → achievements
- 其他描述 → responsibilities
- 遇到逗号/顿号/分号 → 拆分为独立项

示例：
"负责系统架构设计，优化性能提升50%，支撑日均10亿+请求"
→ responsibilities: ["负责系统架构设计"]
→ achievements: ["优化性能提升50%", "支撑日均10亿+请求"]

## 3. 教育背景
- school, degree, major, startDate, endDate
- courses: 主要课程数组（如有）
- honors: 荣誉奖项数组（如有）

## 4. 技能
找"技能"/"技术栈"章节，每项单独提取：
"Python, Go, Docker" → ["Python", "Go", "Docker"]

## 5. 项目经验
- name, role, description, startDate, endDate
- technologies: 使用技术数组

## 6. 其他
- certificates: 证书数组
- languages: 语言能力数组
- summary: 自我评价

对每个字段，同时返回一个 _confidence 值（0-1 浮点数），表示提取置信度。
例如：{ "basics": { "name": "张三", "name_confidence": 0.95, "email": "a@b.com", "email_confidence": 0.8 } }

返回完整JSON，确保数组字段为数组类型。`
  };

  const SCENARIO_SUPPLEMENTS = {
    fresh: `\n注意：这是应届生简历
- 工作经历可能为空或仅有实习
- 重点关注：教育背景、项目经验、技能、实习经历
- 项目经验按完整格式提取`,

    tech: `\n注意：这是技术岗位简历
- 技能栈必须逐项提取，不要遗漏
- 项目经验中的技术细节要完整提取
- technologies字段必须填充`,

    executive: `\n注意：这是高管简历
- 重点提取业绩数据（数字、百分比、规模）
- achievements字段必须包含量化成果
- 管理范围（团队规模、预算）要提取`,

    general: ''
  };

  return PROMPTS[type] + SCENARIO_SUPPLEMENTS[scenario];
}
