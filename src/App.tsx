import { useStore } from './lib/store/parseStore';
import FileUpload from './components/FileUpload';
import JsonEditor from './components/JsonEditor';
import ExportButton from './components/ExportButton';
import ValidationPanel from './components/ValidationPanel';
import MetricsPanel from './components/MetricsPanel';
import BatchUpload from './components/BatchUpload';

export default function App() {
  const { resume, isLoading, validationResult } = useStore();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">简历解析</h1>
        <p className="text-sm text-gray-500 mt-1">上传简历文件，AI 自动提取结构化数据</p>
      </div>

      <div className="space-y-6">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-brand-600">
            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            解析中...
          </div>
        )}

        <FileUpload />
        <MetricsPanel />
        <BatchUpload />

        {resume && (
          <div className="space-y-4 animate-fade-in">
            <ValidationPanel result={validationResult} />
            <JsonEditor />
            <ExportButton />
          </div>
        )}
      </div>
    </div>
  );
}
