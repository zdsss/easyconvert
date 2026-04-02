import { useStore } from '@lib/store/parseStore';
import { classifyFile } from '@lib/classifiers/classifier';
import { processResume } from '@lib/core/resumeProcessor';
import { recordFailure } from '@lib/metrics';
import { BATCH_CONFIG } from '@lib/constants';
import { ValidationError } from '@lib/types';
import { useState } from 'react';
import ProgressTracker from './ProgressTracker';

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

  const handleFile = async (file: File) => {
    try {
      setError('');
      resetProcess();

      if (!file.name.match(/\.(pdf|docx)$/i)) {
        throw new ValidationError('仅支持PDF和DOCX格式');
      }

      if (file.size > BATCH_CONFIG.MAX_FILE_SIZE) {
        throw new ValidationError('文件大小不能超过10MB');
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
    <div className="space-y-6">
      {/* 进度指示器 */}
      {isProcessing && (
        <ProgressTracker stages={processState.stages} currentStage={processState.currentStage} />
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start space-x-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <p className="font-medium text-red-800">处理失败</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* 上传区域 */}
      <div
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files[0]);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="group relative border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
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
          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📎</div>
          <p className="text-xl font-medium text-gray-700 mb-2">拖拽文件到此处或点击上传</p>
          <p className="text-sm text-gray-500">支持 PDF 和 DOCX 格式，最大 10MB</p>
        </label>
      </div>
    </div>
  );
}
