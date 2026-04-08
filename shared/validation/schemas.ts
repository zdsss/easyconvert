import { z } from 'zod';

// ---------------------------------------------------------------------------
// Resume Zod Schema — single source of truth
// .describe() annotations are used to generate JSON Schema for LLM prompts.
// ---------------------------------------------------------------------------

export const resumeSchema = z.object({
  basics: z.object({
    name: z.string().min(1).describe('姓名'),
    email: z.string().email().describe('邮箱地址'),
    phone: z.string().regex(/^[\d\s\-+()]+$/).describe('联系电话'),
    title: z.string().describe('职位意向或当前职位').optional(),
    location: z.string().describe('所在地址或城市').optional(),
  }).describe('基本信息'),
  work: z.array(z.object({
    company: z.string().describe('公司名称'),
    position: z.string().describe('职位名称'),
    startDate: z.string().describe('入职日期，格式YYYY-MM'),
    endDate: z.string().describe('离职日期，格式YYYY-MM，在职填"至今"'),
    responsibilities: z.array(z.string()).describe('工作职责列表，每条职责为独立字符串').optional(),
    achievements: z.array(z.string()).describe('业绩成果列表，每条成果为独立字符串').optional(),
    highlights: z.array(z.string()).describe('工作亮点').optional(),
  })).describe('工作经历'),
  education: z.array(z.object({
    institution: z.string().describe('学校名称'),
    degree: z.string().describe('学历（如本科、硕士）'),
    major: z.string().describe('专业名称').optional(),
    startDate: z.string().describe('入学日期，格式YYYY-MM'),
    endDate: z.string().describe('毕业日期，格式YYYY-MM'),
    courses: z.array(z.string()).describe('主修课程列表').optional(),
    honors: z.array(z.string()).describe('荣誉奖项列表').optional(),
    gpa: z.string().describe('GPA或成绩排名信息').optional(),
  })).describe('教育经历'),
  skills: z.array(z.string()).describe('技能列表，包括编程语言、工具、专业技能等').optional(),
  certificates: z.array(z.object({
    name: z.string().describe('证书名称'),
    issuer: z.string().describe('颁发机构').optional(),
    date: z.string().describe('获得日期，格式YYYY-MM').optional(),
  })).describe('证书列表').optional(),
  projects: z.array(z.object({
    name: z.string().describe('项目名称'),
    role: z.string().describe('项目角色').optional(),
    startDate: z.string().describe('开始日期，格式YYYY-MM').optional(),
    endDate: z.string().describe('结束日期，格式YYYY-MM').optional(),
    description: z.string().describe('项目描述').optional(),
    achievements: z.array(z.string()).describe('项目成果列表').optional(),
  })).describe('项目经历').optional(),
  summary: z.string().describe('自我评价或个人简介').optional(),
  additional: z.record(z.string(), z.unknown()).describe('其他未分类信息').optional(),
});

export type ResumeData = z.infer<typeof resumeSchema>;
