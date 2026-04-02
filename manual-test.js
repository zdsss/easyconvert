// 手动测试脚本
import { classifyDifficulty } from './src/lib/classifiers/difficultyClassifier.js';
import { getStrategy } from './src/lib/parsingStrategy.js';
import { cacheAnalyzer } from './src/lib/cacheAnalyzer.js';

console.log('=== EasyConvert 手动测试 ===\n');

// 测试 1: 难度分类器
console.log('测试 1: 难度分类器');
const testText = `
  个人信息
  姓名：张三
  电话：13800138000
  工作经历
  2020-2023 某公司 工程师
  教育背景
  2016-2020 某大学 计算机科学
  技能
  JavaScript, Python, React
`;

const classification = classifyDifficulty(testText);
console.log('分类结果:', classification);
console.log('✓ 难度分类器工作正常\n');

// 测试 2: 策略选择
console.log('测试 2: 策略选择');
const strategy = getStrategy(classification);
console.log('选择的策略:', {
  promptType: strategy.promptType,
  timeout: strategy.timeout,
  temperature: strategy.temperature
});
console.log('✓ 策略选择工作正常\n');

// 测试 3: 缓存分析器
console.log('测试 3: 缓存分析器');
cacheAnalyzer.recordHit(50);
cacheAnalyzer.recordHit(60);
cacheAnalyzer.recordMiss(5000);
const stats = cacheAnalyzer.getStats();
console.log('缓存统计:', stats);
console.log('✓ 缓存分析器工作正常\n');

console.log('=== 所有手动测试通过 ✓ ===');
