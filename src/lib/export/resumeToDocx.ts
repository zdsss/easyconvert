import type { Resume } from '../types';

export type ExportTemplate = 'simple' | 'professional';

export async function exportToDocx(resume: Resume, template: ExportTemplate = 'simple'): Promise<void> {
  // Lazy-load heavy dependencies (~150KB) only when user exports
  const [{ Packer }, { buildSimpleDoc }, { buildProfessionalDoc }] = await Promise.all([
    import('docx'),
    import('./templates/simple'),
    import('./templates/professional'),
  ]);
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
