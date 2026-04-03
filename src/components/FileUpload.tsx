import { useStore } from '@lib/store/parseStore';
import { classifyFile } from '@lib/classifiers/classifier';
import { processResume } from '@lib/core/resumeProcessor';
import { recordFailure } from '@lib/metrics';
import { BATCH_CONFIG } from '@lib/constants';
import { ValidationError } from '@lib/types';
import { useState } from 'react';
import ProgressTracker from './ProgressTracker';
import Icon from './ui/Icon';

export default function FileUpload() {
  const {
    setResume,
    setLoading,
    setFileClassification,
    setContentClassification,
    setCacheHit,
    setValidationResult,
    processState,
    updateStage,
    resetProcess
  } = useStore();
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = async (file: File) => {
    try {
      setError('');
      resetProcess();

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
        onStageComplete: (stageName) => {
          updateStage(stageName, 'completed');
        },
      });

      setCacheHit(result.fromCache);
      setResume(result.resume);
      if (result.classification) setContentClassification(result.classification);
      if (result.validation) setValidationResult(result.validation);
    } catch (error) {
      recordFailure();
      const message = (error as Error).message;

      if (message.includes('格式错误或已损坏')) {
        setError('文件格式错误或已损坏');
      } else if (message.includes('超时') || message.includes('timeout')) {
        setError('处理超时，请重试');
      } else if (message.includes('验证') || message.includes('不完整')) {
        setError('简历信息不完整');
      } else if (message.includes('API') || message.includes('服务')) {
        setError('服务暂时不可用');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress stepper */}
      {isProcessing && (
        <ProgressTracker stages={processState.stages} currentStage={processState.currentStage} />
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-status-error-bg border border-red-200">
          <Icon name="alert-triangle" size={18} className="text-status-error shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">处理失败</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        className={`card-hover relative rounded-xl p-12 text-center cursor-pointer border-2 border-dashed transition-all duration-200 ${
          isDragOver
            ? 'border-brand-400 bg-brand-50 shadow-md'
            : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/30'
        }`}
      >
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
          id="file-input"
          disabled={isProcessing}
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            isDragOver ? 'bg-brand-100 scale-110' : 'bg-surface-tertiary'
          }`}>
            <Icon name="upload" size={24} className={isDragOver ? 'text-brand-600' : 'text-gray-400'} />
          </div>
          <p className="text-base font-medium text-gray-700 mb-1">
            拖拽文件到此处或点击上传
          </p>
          <p className="text-sm text-gray-400">
            支持 PDF、DOCX 格式，最大 10MB
          </p>
        </label>
      </div>
    </div>
  );
}
