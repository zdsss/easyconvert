import { Document, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { Resume } from '../../types';

export function buildSimpleDoc(resume: Resume): Document {
  const children: Paragraph[] = [];

  // Name as H1
  children.push(new Paragraph({
    text: resume.basics.name,
    heading: HeadingLevel.HEADING_1,
  }));

  // Contact line
  const contact = [resume.basics.email, resume.basics.phone, resume.basics.location]
    .filter(Boolean).join(' | ');
  if (contact) children.push(new Paragraph({ text: contact }));

  // Work experience
  if (resume.work?.length) {
    children.push(new Paragraph({ text: '工作经历', heading: HeadingLevel.HEADING_2 }));
    for (const w of resume.work) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: w.company, bold: true }),
          new TextRun({ text: `  ${w.position}  ${w.startDate}–${w.endDate ?? '至今'}` }),
        ],
      }));
    }
  }

  // Education
  if (resume.education?.length) {
    children.push(new Paragraph({ text: '教育背景', heading: HeadingLevel.HEADING_2 }));
    for (const e of resume.education) {
      children.push(new Paragraph({
        text: `${e.institution}  ${e.degree}${e.major ? '  ' + e.major : ''}  ${e.startDate}–${e.endDate ?? ''}`,
      }));
    }
  }

  // Skills
  if (resume.skills?.length) {
    children.push(new Paragraph({ text: '技能', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: resume.skills.join('、') }));
  }

  return new Document({ sections: [{ children }] });
}
