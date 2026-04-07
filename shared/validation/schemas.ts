import { z } from 'zod';

export const resumeSchema = z.object({
  basics: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().regex(/^[\d\s\-+()]+$/).optional(),
    title: z.string().optional(),
    location: z.string().optional()
  }).refine(data => data.email || data.phone, {
    message: '必须提供邮箱或电话'
  }),
  work: z.array(z.object({
    company: z.string(),
    position: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    responsibilities: z.array(z.string()).optional(),
    achievements: z.array(z.string()).optional()
  })).optional(),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string().optional(),
    major: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    courses: z.array(z.string()).optional(),
    honors: z.array(z.string()).optional()
  })).optional(),
  skills: z.array(z.string()).optional(),
  projects: z.array(z.object({
    name: z.string(),
    role: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })).optional()
});

export type ResumeData = z.infer<typeof resumeSchema>;
