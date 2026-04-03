import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { evaluationApi } from '@lib/api/evaluationApi';
import { logger } from '@lib/logger';
import StepIndicator from '@components/ui/StepIndicator';
import ConfirmDialog from '@components/ui/ConfirmDialog';
import Icon from '@components/ui/Icon';

const STEPS = [
  { label: '基本信息' },
  { label: '策略配置' },
  { label: '上传文件' },
  { label: '确认创建' },
];

export default function EvaluationNew() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'batch',
    config: {
      enableFieldLevel: true,
      enableClassification: true,
      enableProcessTrace: true,
      accuracyMethod: 'partial' as 'exact' | 'partial' | 'semantic',
      strategy: 'auto' as 'auto' | 'fixed' | 'ab',
      difficultyFilter: 'all' as 'all' | 'easy' | 'standard' | 'hard',
      concurrency: 3,
    },
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [annotationFile, setAnnotationFile] = useState<File | null>(null);

  const completedSteps = Array.from({ length: currentStep }, (_, i) => i);

  const canNext = () => {
    if (currentStep === 0) return formData.name.trim().length > 0;
    if (currentStep === 2) return true; // files optional
    return true;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setCreating(true);
    try {
      const task = await evaluationApi.createTask({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        config: formData.config,
      });
      navigate(`/evaluation/${task.id}`);
    } catch (err) {
      logger.error('Failed to create task', err as Error);
      setError(err instanceof Error ? err.message : '创建失败，请确保后端服务已启动');
      setCreating(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    setFormData({ ...formData, config: { ...formData.config, [key]: value } });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setShowCancel(true)} className="btn-ghost p-1.5">
          <Icon name="arrow-left" size={18} />
        </button>
        <div>
          <h1 className="page-title">新建评测任务</h1>
          <p className="text-sm text-text-secondary mt-0.5">按步骤配置评测参数</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="card p-5 mb-6">
        <StepIndicator steps={STEPS} currentStep={currentStep} completedSteps={completedSteps} />
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-lg bg-status-error-bg border border-red-200 dark:border-red-800">
          <Icon name="alert-triangle" size={16} className="text-status-error shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className="card p-6 mb-6 animate-fade-in">
        {currentStep === 0 && (
          <div className="space-y-4">
            <h3 className="section-title flex items-center gap-2">
              <Icon name="edit" size={16} className="text-text-tertiary" />
              基本信息
            </h3>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">任务名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="例如：v2.0 策略矩阵评测"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">描述</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="input resize-none"
                rows={3}
                placeholder="评测目标和范围说明..."
              />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-5">
            <h3 className="section-title flex items-center gap-2">
              <Icon name="settings" size={16} className="text-text-tertiary" />
              策略配置
            </h3>

            {/* Strategy type */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">解析策略</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'auto', label: '自动', desc: '根据难度自动选择' },
                  { value: 'fixed', label: '固定', desc: '使用固定策略' },
                  { value: 'ab', label: 'A/B 测试', desc: '对比两种策略' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateConfig('strategy', opt.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.config.strategy === opt.value
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-border hover:border-brand-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty filter */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">难度过滤</label>
              <select
                value={formData.config.difficultyFilter}
                onChange={e => updateConfig('difficultyFilter', e.target.value)}
                className="input"
              >
                <option value="all">全部难度</option>
                <option value="easy">简单</option>
                <option value="standard">标准</option>
                <option value="hard">困难</option>
              </select>
            </div>

            {/* Concurrency */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">并发数: {formData.config.concurrency}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={formData.config.concurrency}
                onChange={e => updateConfig('concurrency', parseInt(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="flex justify-between text-xs text-text-tertiary mt-1">
                <span>1</span><span>5</span><span>10</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              {[
                { key: 'enableFieldLevel', label: '字段级准确率', desc: '逐字段对比解析结果与标注数据' },
                { key: 'enableClassification', label: '启用分类', desc: '难度/完整度/场景三维分类' },
                { key: 'enableProcessTrace', label: '处理追踪', desc: '记录 8 阶段管线耗时' },
              ].map(opt => (
                <label key={opt.key} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formData.config as any)[opt.key]}
                    onChange={e => updateConfig(opt.key, e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                    <p className="text-xs text-text-tertiary mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">准确率计算方法</label>
              <select
                value={formData.config.accuracyMethod}
                onChange={e => updateConfig('accuracyMethod', e.target.value)}
                className="input"
              >
                <option value="exact">精确匹配</option>
                <option value="partial">部分匹配 (80%+)</option>
                <option value="semantic">语义匹配</option>
              </select>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5">
            <h3 className="section-title flex items-center gap-2">
              <Icon name="upload" size={16} className="text-text-tertiary" />
              上传文件
            </h3>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">简历文件</label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={e => setFiles(e.target.files)}
                className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-400"
              />
              {files && <p className="text-xs text-text-tertiary mt-1">已选择 {files.length} 个文件</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">标注文件（可选）</label>
              <input
                type="file"
                accept=".json"
                onChange={e => setAnnotationFile(e.target.files?.[0] || null)}
                className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-surface-tertiary file:text-text-secondary hover:file:bg-gray-200"
              />
              {annotationFile && <p className="text-xs text-text-tertiary mt-1">{annotationFile.name}</p>}
              <p className="text-xs text-text-tertiary mt-2">上传 JSON 格式的标注数据，用于计算准确率</p>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5">
            <h3 className="section-title flex items-center gap-2">
              <Icon name="check-circle" size={16} className="text-text-tertiary" />
              确认创建
            </h3>
            <div className="space-y-3">
              <SummaryRow label="任务名称" value={formData.name} />
              {formData.description && <SummaryRow label="描述" value={formData.description} />}
              <SummaryRow label="策略" value={formData.config.strategy === 'auto' ? '自动' : formData.config.strategy === 'fixed' ? '固定' : 'A/B 测试'} />
              <SummaryRow label="难度过滤" value={formData.config.difficultyFilter === 'all' ? '全部' : formData.config.difficultyFilter} />
              <SummaryRow label="并发数" value={String(formData.config.concurrency)} />
              <SummaryRow label="准确率方法" value={formData.config.accuracyMethod} />
              <SummaryRow label="文件数" value={files ? `${files.length} 个` : '未上传（可在详情页上传）'} />
              {annotationFile && <SummaryRow label="标注文件" value={annotationFile.name} />}
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg">
              <p className="text-xs text-text-secondary">
                预估处理时间：{files ? `约 ${Math.ceil(files.length * 3 / formData.config.concurrency)} 秒` : '-'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={currentStep === 0 ? () => setShowCancel(true) : handleBack}
          className="btn-secondary"
        >
          {currentStep === 0 ? '取消' : '上一步'}
        </button>
        <div className="flex gap-2">
          {currentStep < STEPS.length - 1 ? (
            <button onClick={handleNext} disabled={!canNext()} className="btn-primary flex items-center gap-2">
              下一步
              <Icon name="chevron-right" size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={creating} className="btn-primary flex items-center gap-2">
              {creating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="plus" size={16} />
              )}
              创建任务
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showCancel}
        onConfirm={() => navigate('/evaluation')}
        onCancel={() => setShowCancel(false)}
        title="放弃创建？"
        description="当前填写的内容将不会保存。"
        confirmLabel="放弃"
        variant="danger"
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center py-2 border-b border-border-light last:border-0">
      <span className="w-24 text-xs text-text-tertiary shrink-0">{label}</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}
