import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvaluationStore, type EvaluationTask } from '@lib/store/evaluationStore';
import { evaluationApi } from '@lib/api/evaluationApi';
import { logger } from '@lib/logger';
import type { TaskResponse } from '@lib/types';

function adaptTaskResponse(task: TaskResponse): EvaluationTask {
  return {
    ...task,
    type: (task.type as 'single' | 'batch') || 'single',
    config: task.config as any || { enableFieldLevel: false, enableClassification: false, enableProcessTrace: false, accuracyMethod: 'exact' },
    stats: task.stats || { totalFiles: 0, processedFiles: 0, successCount: 0, failureCount: 0 },
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt || task.createdAt)
  };
}

export default function EvaluationList() {
  const navigate = useNavigate();
  const { tasks, setTasks, isLoading, setLoading } = useEvaluationStore();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await evaluationApi.getTasks();
      setTasks(Array.isArray(data) ? data.map(adaptTaskResponse) : []);
    } catch (error) {
      logger.error('Failed to load tasks', error as Error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">评测任务</h1>
        <button
          onClick={() => navigate('/evaluation/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          新建评测
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">📊</div>
          <p className="text-gray-500 mb-4">暂无评测任务</p>
          <button
            onClick={() => navigate('/evaluation/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            创建第一个评测
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div
              key={task.id}
              onClick={() => navigate(`/evaluation/${task.id}`)}
              className="p-4 border rounded cursor-pointer hover:bg-gray-50"
            >
              <div className="flex justify-between">
                <h3 className="font-semibold">{task.name}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  task.status === 'completed' ? 'bg-green-100 text-green-800' :
                  task.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  task.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {task.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{task.description}</p>
              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <span>总数: {task.stats.totalFiles}</span>
                <span>成功: {task.stats.successCount}</span>
                <span>失败: {task.stats.failureCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
