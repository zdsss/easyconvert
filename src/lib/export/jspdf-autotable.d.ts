import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    autoTable(options: {
      startY?: number;
      head?: string[][];
      body?: (string | number)[][];
      theme?: 'striped' | 'grid' | 'plain';
      headStyles?: { fillColor?: number[]; [key: string]: unknown };
      styles?: { fontSize?: number; [key: string]: unknown };
      [key: string]: unknown;
    }): jsPDF;
    lastAutoTable: { finalY: number };
  }
}
