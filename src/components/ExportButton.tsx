import { useStore } from '@lib/store/parseStore';

export default function ExportButton() {
  const { resume } = useStore();

  const handleExport = () => {
    if (!resume) return;

    const json = JSON.stringify(resume, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport} className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
      导出JSON
    </button>
  );
}
