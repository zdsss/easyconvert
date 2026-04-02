import { parseDocx } from './src/lib/parseDocx.js';
import { extractWithLLM } from './src/lib/extractWithLLM.js';
import { readFileSync } from 'fs';

const testFile = 'test-resumes/phase3-real-samples/real-001-DXS-0010.docx';
console.log('Testing enhanced parsing with:', testFile);

const buffer = readFileSync(testFile);
const text = await parseDocx(buffer);

console.log('\n=== Extracted Text (first 500 chars) ===');
console.log(text.substring(0, 500));

console.log('\n=== Calling LLM with comprehensive strategy ===');
const result = await extractWithLLM(text, 'comprehensive', 'qwen');

console.log('\n=== Parsed Resume Data ===');
console.log(JSON.stringify(result, null, 2));
