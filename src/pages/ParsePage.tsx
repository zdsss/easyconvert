import { useState } from 'react';
import { useStore } from '@lib/store/parseStore';
import { classifyFile } from '@lib/classifiers/classifier';
import { processResume } from '@lib/core/resumeProcessor';
import { recordFailure } from '@lib/metrics';
import { parseHistoryApi } from '@lib/api/parseHistoryApi';
import { BATCH_CONFIG } from '@lib/constants';
import { ValidationError } from '@lib/types';
import ProgressTracker from '@components/ProgressTracker';
import ParseResultTabs from '@components/ParseResultTabs';
import FilePreviewCard from '@components/FilePreviewCard';
import ValidationPanel from '@components/ValidationPanel';
import ExportButton from '@components/ExportButton';
import Icon from '@components/ui/Icon';

export default function ParsePage() {
  const {
    resume, setResume, setLoading,
    setFileClassification, setContentClassification,
    setCacheHit, setValidationResult, validationResult,
    processState, updateStage, resetProcess,
  } = useStore();
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const handleFile = async (file: File) => {
    const startTime = Date.now();
    try {
      setError('');
      resetProcess();
      setCurrentFile(file);

      if (!file.name.match(/\.(pdf|docx)$/i)) {
        throw new ValidationError('仅支持 PDF 和 DOCX 格式');
      }
      if (file.size > BATCH_CONFIG.MAX_FILE_SIZE) {
        throw new ValidationError('文件大小不能超过 10MB');
      }

      setLoading(true);
      setIsProcessing(true);
      updateStage('file_upload', 'processing');

      const fileClass = classifyFile(file);
      setFileClassification(fileClass);

      const result = await processResume(file, {
        enableCache: true,
        enableClassification: true,
        enableValidation: true,
        onStageComplete: (stageName) => updateStage(stageName, 'completed'),
      });

      setCacheHit(result.fromCache);
      setResume(result.resume);
      if (result.classification) setContentClassification(result.classification);
      if (result.validation) setValidationResult(result.validation);

      // Fire-and-forget: save to history
      parseHistoryApi.save({
        fileName: file.name,
        fileHash: result.hash,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        status: 'completed',
        result: result.resume,
        processingTime: Date.now() - startTime,
      }).catch(() => {});
    } catch (err) {
      recordFailure();
      const message = (err as Error).message;
      if (message.includes('格式错误或已损坏')) setError('文件格式错误或已损坏');
      else if (message.includes('超时') || message.includes('timeout')) setError('处理超时，请重试');
      else setError(message);

      // Fire-and-forget: save failure to history
      if (file.name.match(/\.(pdf|docx)$/i)) {
        parseHistoryApi.save({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          status: 'failed',
          error: message,
          processingTime: Date.now() - startTime,
        }).catch(() => {});
      }
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const handleRemoveFile = () => {
    setCurrentFile(null);
    resetProcess();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">解析简历</h1>
        <p className="text-sm text-text-secondary mt-1">上传简历文件，AI 自动提取结构化数据</p>
      </div>

      <div className="space-y-4">
        {/* File preview */}
        {currentFile && !isProcessing && (
          <FilePreviewCard file={currentFile} onRemove={handleRemoveFile} />
        )}

        {/* Progress tracker */}
        {isProcessing && (
          <ProgressTracker stages={processState.stages} currentStage={processState.currentStage} />
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-status-error-bg border border-red-200 dark:border-red-800">
            <Icon name="alert-triangle" size={18} className="text-status-error shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-400">处理失败</p>
              <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Upload zone */}
        {!currentFile && (
          <div
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={`card-hover relative rounded-xl p-12 text-center cursor-pointer border-2 border-dashed transition-all duration-200 ${
              isDragOver
                ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 shadow-md'
                : 'border-border hover:border-brand-300 hover:bg-brand-50/30 dark:hover:bg-brand-900/10'
            }`}
          >
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
              id="parse-file-input"
              disabled={isProcessing}
            />
            <label htmlFor="parse-file-input" className="cursor-pointer">
              <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                isDragOver ? 'bg-brand-100 dark:bg-brand-800 scale-110' : 'bg-surface-tertiary'
              }`}>
                <Icon name="upload" size={24} className={isDragOver ? 'text-brand-600' : 'text-text-tertiary'} />
              </div>
              <p className="text-base font-medium text-text-primary mb-1">拖拽文件到此处或点击上传</p>
              <p className="text-sm text-text-tertiary">支持 PDF、DOCX 格式，最大 10MB</p>
            </label>
          </div>
        )}

        {/* Results */}
        {resume && !isProcessing && (
          <div className="space-y-4 animate-fade-in">
            <ParseResultTabs resume={resume} />
            <ValidationPanel result={validationResult} />
            <ExportButton />
          </div>
        )}
      </div>
    </div>
  );
}
