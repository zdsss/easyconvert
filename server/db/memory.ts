// 内存存储 - 用于开发环境
interface Task {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  config: any;
  stats: any;
  created_at: string;
  updated_at: string;
}

interface Result {
  id: string;
  task_id: string;
  file_name: string;
  file_hash: string;
  parsed_resume: any;
  annotation?: any;
  classification?: any;
  process_trace?: any;
  metrics: any;
  processing_time: number;
  from_cache: boolean;
  created_at: string;
}

const tasks: Task[] = [];
const results: Result[] = [];

export const memoryDb = {
  async query(text: string, params?: any[]) {
    // INSERT evaluation_tasks
    // SQL: VALUES ($1=name, $2=description, $3=type, 'pending', $4=config, '{}')
    if (text.includes('INSERT INTO evaluation_tasks')) {
      const task: Task = {
        id: Date.now().toString(),
        name: params![0],
        description: params![1] || '',
        type: params![2],
        status: 'pending',
        config: params![3],
        stats: { totalFiles: 0, processedFiles: 0, successCount: 0, failureCount: 0 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      tasks.push(task);
      return { rows: [task] };
    }

    // SELECT evaluation_tasks with WHERE
    if (text.includes('SELECT') && text.includes('evaluation_tasks')) {
      if (text.includes('WHERE id')) {
        const id = params![0];
        return { rows: tasks.filter(t => t.id === id) };
      }
      if (text.includes('WHERE status')) {
        const status = params![0];
        return { rows: tasks.filter(t => t.status === status) };
      }
      return { rows: tasks };
    }

    // UPDATE evaluation_tasks
    // SQL: SET status = $1, stats = $2 WHERE id = $3
    if (text.includes('UPDATE evaluation_tasks')) {
      const id = params![params!.length - 1];
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.status = params![0];
        task.stats = params![1];
        task.updated_at = new Date().toISOString();
        return { rows: [task] };
      }
      return { rows: [] };
    }

    // UPDATE evaluation_results (for annotations)
    if (text.includes('UPDATE evaluation_results')) {
      const annotation = params![0];
      const resultId = params![1];
      const result = results.find(r => r.id === resultId);
      if (result) {
        result.annotation = annotation;
        return { rows: [result] };
      }
      return { rows: [] };
    }

    // INSERT evaluation_results
    if (text.includes('INSERT INTO evaluation_results')) {
      const result: Result = {
        id: Date.now().toString(),
        task_id: params![0],
        file_name: params![1],
        file_hash: params![2],
        parsed_resume: params![3],
        classification: params![4],
        process_trace: params![5],
        metrics: params![6],
        processing_time: params![7],
        from_cache: params![8] || false,
        created_at: new Date().toISOString(),
      };
      results.push(result);
      return { rows: [result] };
    }

    // SELECT evaluation_results with WHERE
    if (text.includes('SELECT') && text.includes('evaluation_results')) {
      if (text.includes('WHERE task_id')) {
        const taskId = params![0];
        return { rows: results.filter(r => r.task_id === taskId) };
      }
      return { rows: results };
    }

    return { rows: [] };
  },
};
