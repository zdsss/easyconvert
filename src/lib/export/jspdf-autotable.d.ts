import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    autoTable(options: {
      startY?: number;
      head?: string[][];
      body?: (string | number)[][];
      theme?: 'striped' | 'grid' | 'plain';
      headStyles?: { fillColor?: number[]; [key: string]: any };
      styles?: { fontSize?: number; [key: string]: any };
      [key: string]: any;
    }): jsPDF;
    lastAutoTable: { finalY: number };
  }
}
