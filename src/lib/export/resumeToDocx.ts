import { Packer } from 'docx';
import { buildSimpleDoc } from './templates/simple';
import { buildProfessionalDoc } from './templates/professional';
import type { Resume } from '../types';

export type ExportTemplate = 'simple' | 'professional';

export async function exportToDocx(resume: Resume, template: ExportTemplate = 'simple'): Promise<void> {
  const doc = template === 'professional' ? buildProfessionalDoc(resume) : buildSimpleDoc(resume);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${resume.basics.name ?? 'resume'}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPdf(): void {
  window.print();
}
