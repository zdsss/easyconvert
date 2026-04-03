import {
  Document, Paragraph, TextRun,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx';
import type { Resume } from '../../types';

const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = {
  top: NONE_BORDER, bottom: NONE_BORDER,
  left: NONE_BORDER, right: NONE_BORDER,
};

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: '333333' })],
  });
}

function buildLeftColumn(resume: Resume): Paragraph[] {
  const items: Paragraph[] = [];

  // Contact
  items.push(sectionTitle('联系方式'));
  if (resume.basics.email) {
    items.push(new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: resume.basics.email, size: 18 })],
    }));
  }
  if (resume.basics.phone) {
    items.push(new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: resume.basics.phone, size: 18 })],
    }));
  }
  if (resume.basics.location) {
    items.push(new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: resume.basics.location, size: 18 })],
    }));
  }

  // Skills
  if (resume.skills?.length) {
    items.push(sectionTitle('技能'));
    for (const skill of resume.skills) {
      items.push(new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun({ text: `• ${skill}`, size: 18 })],
      }));
    }
  }

  // Certificates
  if (resume.certificates?.length) {
    items.push(sectionTitle('证书'));
    for (const cert of resume.certificates) {
      items.push(new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun({ text: cert.name, size: 18, bold: true })],
      }));
      const meta = [cert.issuer, cert.date].filter(Boolean).join(' · ');
      if (meta) {
        items.push(new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: meta, size: 16, color: '666666' })],
        }));
      }
    }
  }

  return items;
}

function buildRightColumn(resume: Resume): Paragraph[] {
  const items: Paragraph[] = [];

  // Name
  items.push(new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: resume.basics.name, bold: true, size: 36 })],
  }));

  // Title
  if (resume.basics.title) {
    items.push(new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: resume.basics.title, size: 22, color: '555555' })],
    }));
  }

  // Summary
  if (resume.summary) {
    items.push(sectionTitle('个人简介'));
    items.push(new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: resume.summary, size: 20 })],
    }));
  }

  // Work experience
  if (resume.work?.length) {
    items.push(sectionTitle('工作经历'));
    for (const w of resume.work) {
      items.push(new Paragraph({
        spacing: { before: 80, after: 30 },
        children: [
          new TextRun({ text: w.company, bold: true, size: 20 }),
          new TextRun({ text: `  |  ${w.position}`, size: 20 }),
        ],
      }));
      items.push(new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: `${w.startDate} – ${w.endDate || '至今'}`, size: 18, color: '888888' })],
      }));
      for (const line of w.responsibilities ?? []) {
        items.push(new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: `• ${line}`, size: 18 })],
        }));
      }
      for (const line of w.achievements ?? []) {
        items.push(new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: `★ ${line}`, size: 18 })],
        }));
      }
    }
  }

  // Education
  if (resume.education?.length) {
    items.push(sectionTitle('教育背景'));
    for (const e of resume.education) {
      items.push(new Paragraph({
        spacing: { before: 60, after: 30 },
        children: [
          new TextRun({ text: e.institution, bold: true, size: 20 }),
          new TextRun({ text: `  ${e.degree}${e.major ? ' · ' + e.major : ''}`, size: 20 }),
        ],
      }));
      items.push(new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: `${e.startDate} – ${e.endDate || ''}`, size: 18, color: '888888' })],
      }));
    }
  }

  // Projects
  if (resume.projects?.length) {
    items.push(sectionTitle('项目经历'));
    for (const p of resume.projects) {
      items.push(new Paragraph({
        spacing: { before: 60, after: 30 },
        children: [
          new TextRun({ text: p.name, bold: true, size: 20 }),
          ...(p.role ? [new TextRun({ text: `  |  ${p.role}`, size: 20 })] : []),
        ],
      }));
      if (p.startDate) {
        items.push(new Paragraph({
          spacing: { after: 30 },
          children: [new TextRun({ text: `${p.startDate} – ${p.endDate || '至今'}`, size: 18, color: '888888' })],
        }));
      }
      if (p.description) {
        items.push(new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: p.description, size: 18 })],
        }));
      }
      for (const a of p.achievements ?? []) {
        items.push(new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: `★ ${a}`, size: 18 })],
        }));
      }
    }
  }

  return items;
}

export function buildProfessionalDoc(resume: Resume): Document {
  const leftParagraphs = buildLeftColumn(resume);
  const rightParagraphs = buildRightColumn(resume);

  const table = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: leftParagraphs,
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: rightParagraphs,
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NONE_BORDER, bottom: NONE_BORDER,
      left: NONE_BORDER, right: NONE_BORDER,
      insideHorizontal: NONE_BORDER,
      insideVertical: NONE_BORDER,
    },
  });

  return new Document({ sections: [{ children: [table] }] });
}
