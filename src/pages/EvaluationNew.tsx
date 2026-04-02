import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { evaluationApi } from '@lib/api/evaluationApi';
import { logger } from '@lib/logger';

export default function EvaluationNew() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'batch',
    config: {
      enableFieldLevel: true,
      enableClassification: true,
      enableProcessTrace: true,
      accuracyMethod: 'partial'
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const task = await evaluationApi.createTask(formData);
      navigate(`/evaluation/${task.id}`);
    } catch (error) {
      logger.error('Failed to create task', error as Error);
      setError(error instanceof Error ? error.message : '创建失败，请确保后端服务已启动');
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">新建评测任务</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">任务名称</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">描述</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            rows={3}
          />
        </div>
        <div className="flex gap-4">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            创建
          </button>
          <button type="button" onClick={() => navigate('/evaluation')} className="px-4 py-2 border rounded">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
