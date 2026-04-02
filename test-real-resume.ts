import { parseDocx } from './src/lib/parseDocx';
import { extractResume } from './src/lib/extractWithLLM';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const testFiles = [
  'test-resumes/phase3-real-samples/real-001-DXS-0010.docx',
  'test-resumes/phase1-core/cn-02-modern-tech.docx'
];

async function testResume(filePath: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${filePath}`);
  console.log('='.repeat(80));

  try {
    const buffer = readFileSync(resolve(filePath));
    const mammoth = await import('mammoth');
    const result = await mammoth.default.extractRawText({ buffer });
    const text = result.value;

    console.log(`\n📄 Extracted text length: ${text.length} chars`);

    const resume = await extractResume(text, {
      timeout: 30000,
      temperature: 0.05,
      maxRetries: 2,
      promptType: 'comprehensive',
      validationType: 'hardness'
    });

    console.log('\n✅ Parsing successful!\n');

    const stats = {
      basics: Object.keys(resume.basics || {}).length,
      work_count: (resume.work || []).length,
      work_responsibilities: (resume.work || []).reduce((sum, w) => sum + (w.responsibilities?.length || 0), 0),
      work_achievements: (resume.work || []).reduce((sum, w) => sum + (w.achievements?.length || 0), 0),
      education_count: (resume.education || []).length,
      education_courses: (resume.education || []).reduce((sum, e) => sum + (e.courses?.length || 0), 0),
      education_honors: (resume.education || []).reduce((sum, e) => sum + (e.honors?.length || 0), 0),
      skills_count: (resume.skills || []).length,
      projects_count: (resume.projects || []).length,
      certificates_count: (resume.certificates || []).length
    };

    console.log('📊 Information Density Stats:');
    console.log(`   Basics fields: ${stats.basics}`);
    console.log(`   Work experiences: ${stats.work_count}`);
    console.log(`   - Total responsibilities: ${stats.work_responsibilities}`);
    console.log(`   - Total achievements: ${stats.work_achievements}`);
    console.log(`   Education records: ${stats.education_count}`);
    console.log(`   - Total courses: ${stats.education_courses}`);
    console.log(`   - Total honors: ${stats.education_honors}`);
    console.log(`   Skills: ${stats.skills_count}`);
    console.log(`   Projects: ${stats.projects_count}`);
    console.log(`   Certificates: ${stats.certificates_count}`);

    console.log('\n📋 Detailed Results:\n');
    console.log(JSON.stringify(resume, null, 2));

    return { success: true, stats };
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Resume Parsing Test - Information Density Validation\n');

  const results = [];
  for (const file of testFiles) {
    const result = await testResume(file);
    results.push({ file, ...result });
  }

  console.log('\n' + '='.repeat(80));
  console.log('📈 Summary');
  console.log('='.repeat(80));

  results.forEach(r => {
    console.log(`\n${r.file}:`);
    if (r.success) {
      console.log(`  ✅ Success`);
      console.log(`  - Responsibilities: ${r.stats.work_responsibilities}`);
      console.log(`  - Achievements: ${r.stats.work_achievements}`);
      console.log(`  - Skills: ${r.stats.skills_count}`);
    } else {
      console.log(`  ❌ Failed: ${r.error}`);
    }
  });
}

main().catch(console.error);
