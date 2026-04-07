type PromptType = 'basic' | 'standard' | 'comprehensive';
type Scenario = 'fresh' | 'tech' | 'executive' | 'general';

const TEMPLATES: Record<PromptType, string> = {
  basic: `提取简历基本信息：
1. 个人信息：姓名、电话、邮箱
2. 工作经历：公司、职位、时间段
3. 教育背景：学校、学位、专业、时间段

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

返回标准JSON。`,

  comprehensive: `深度提取简历信息，严格遵循以下规则：

## 1. 基本信息
- 姓名：必填
- 联系方式：电话、邮箱至少一项
- 职位意向：如有则提取

## 2. 工作经历（关键）
每段经历必须包含：
- company, position, startDate, endDate
- responsibilities: 职责列表（数组）

## 3. 教育背景
- institution, degree, major, startDate, endDate

## 4. 技能与项目
- skills: 技能列表
- projects: 项目经历

返回完整JSON。`
};

const SCENARIO_SUPPLEMENTS: Record<Scenario, string> = {
  fresh: '注意：这是应届生简历，重点提取实习经历和校园项目。',
  tech: '注意：这是技术岗位简历，重点提取技术栈和项目细节。',
  executive: '注意：这是高管简历，重点提取管理经验和业绩数据。',
  general: ''
};

class PromptEngine {
  buildPrompt(type: PromptType, scenario: Scenario, schema?: string): string {
    let prompt = TEMPLATES[type];
    const supplement = SCENARIO_SUPPLEMENTS[scenario];
    if (supplement) prompt += `\n\n${supplement}`;
    if (schema) prompt += `\n\nJSON Schema:\n${schema}`;
    return prompt;
  }
}

export const promptEngine = new PromptEngine();
