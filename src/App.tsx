import { useState } from 'react';
import { useStore } from './lib/store/parseStore';
import FileUpload from './components/FileUpload';
import JsonEditor from './components/JsonEditor';
import ExportButton from './components/ExportButton';
import ValidationPanel from './components/ValidationPanel';
import MetricsPanel from './components/MetricsPanel';
import BatchUpload from './components/BatchUpload';
import Dashboard from './components/Dashboard';

export default function App() {
  const { resume, isLoading, validationResult } = useStore();
  const [activeTab, setActiveTab] = useState<'parse' | 'dashboard'>('parse');

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">简历解析</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('parse')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'parse'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            解析
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'dashboard'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            监控
          </button>
        </div>

        {activeTab === 'parse' ? (
          <>
            {isLoading && <p className="text-blue-500 mb-4">解析中...</p>}
            <FileUpload />
            <MetricsPanel />
            <BatchUpload />
            {resume && (
              <>
                <ValidationPanel result={validationResult} />
                <JsonEditor />
                <ExportButton />
              </>
            )}
          </>
        ) : (
          <Dashboard />
        )}
      </div>
    </div>
  );
}
