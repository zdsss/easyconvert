type PromptType = 'basic' | 'standard' | 'comprehensive';
type Scenario = 'fresh' | 'tech' | 'executive' | 'general';

const templates = {
  basic: '提取简历基本信息：姓名、电话、邮箱、工作经历、教育背景。返回JSON格式。',
  standard: '提取完整简历信息，包含：basics(name,phone,email), work[], education[], skills[]。日期格式YYYY-MM。',
  comprehensive: '深度提取简历所有信息，严格遵循JSON Schema。拆分数组字段，规范化日期格式。'
};

export function renderPrompt(type: PromptType, _scenario: Scenario, schema?: string): string {
  let prompt = templates[type];
  if (schema) prompt += `\n\nJSON Schema:\n${schema}`;
  return prompt;
}
