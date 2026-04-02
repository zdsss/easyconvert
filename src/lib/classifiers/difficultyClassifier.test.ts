import { describe, it, expect } from 'vitest';
import { classifyDifficulty } from './difficultyClassifier';

describe('difficultyClassifier', () => {
  it('classifies easy resume with standard headers', () => {
    const text = `
      个人信息
      姓名：张三
      工作经历
      2020-2023 某公司
      教育背景
      2016-2020 某大学
      技能
      JavaScript
    `;
    const result = classifyDifficulty(text);
    expect(result.difficulty).toBe('easy');
  });

  it('classifies standard resume with mixed languages', () => {
    const text = `
      Personal Info / 个人信息
      Name: John Zhang / 张三
      Work Experience / 工作经历
      2020-2023 Tech Company / 科技公司
      Education / 教育背景
      2016-2020 University / 大学
      @@##$$%%^^&&**(())
      Very long paragraph with more than 100 characters to trigger complexity score increase for testing purposes here.
      Another very long paragraph with more than 100 characters to trigger complexity score increase for testing purposes.
      Yet another very long paragraph with more than 100 characters to trigger complexity score increase for testing.
      One more very long paragraph with more than 100 characters to trigger complexity score increase for testing here.
      Final very long paragraph with more than 100 characters to trigger complexity score increase for testing purposes.
      Extra very long paragraph with more than 100 characters to trigger complexity score increase for testing purposes.
    `;
    const result = classifyDifficulty(text);
    expect(result.difficulty).toBe('standard');
  });

  it('identifies tech scenario', () => {
    const text = `
      工作经历
      某公司 工程师
      技能
      Python Java JavaScript Docker Kubernetes MySQL Redis
      项目经验
      项目1: 电商系统
      项目2: 数据平台
    `;
    const result = classifyDifficulty(text);
    expect(result.scenario).toBe('tech');
  });

  it('identifies fresh graduate scenario', () => {
    const text = `
      教育背景
      2020-2024 某大学
      实习经历
      2023 某公司实习生
    `;
    const result = classifyDifficulty(text);
    expect(result.scenario).toBe('fresh');
  });

  it('assesses rich completeness', () => {
    const text = `
      个人信息 姓名 电话
      工作经历 公司
      教育背景 学历
      技能 专业技能
      项目经验 项目
      证书 资格证书
      自我评价 简介
      荣誉 奖项
      语言 外语
    `;
    const result = classifyDifficulty(text);
    expect(result.completeness).toBe('rich');
  });
});
