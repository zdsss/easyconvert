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

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface ParseJob {
  id: string;
  tenant_id: string | null;
  api_key_id: string | null;
  status: string;
  file_name: string;
  file_hash: string | null;
  file_size: number;
  mime_type: string;
  result: any;
  error: string | null;
  processing_time: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  webhook_url: string | null;
  webhook_status: string | null;
}

interface CacheEntry {
  hash: string;
  data: any;
  version: string;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PromptExperiment {
  id: string;
  task_ids: any;
  weak_fields: any;
  suggestion: string;
  status: string;
  created_at: string;
}

interface FlywheelPromotion {
  id: string;
  candidate_id: string;
  evaluation_task_id: string;
  promoted_at: string;
}

const tasks: Task[] = [];
const results: Result[] = [];
const tenants: Tenant[] = [];
const apiKeys: ApiKey[] = [];
const parseJobs: ParseJob[] = [];
const parseCache: CacheEntry[] = [];
const promptExperiments: PromptExperiment[] = [];
const flywheelPromotions: FlywheelPromotion[] = [];

let idCounter = Date.now();
function nextId() { return (++idCounter).toString(); }

export const memoryDb = {
  async query(text: string, params?: any[]) {
    // --- evaluation_tasks ---
    if (text.includes('INSERT INTO evaluation_tasks')) {
      const task: Task = {
        id: nextId(),
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

    if (text.includes('SELECT') && text.includes('evaluation_tasks')) {
      if (text.includes('WHERE id')) {
        return { rows: tasks.filter(t => t.id === params![0]) };
      }
      if (text.includes('WHERE status')) {
        return { rows: tasks.filter(t => t.status === params![0]) };
      }
      return { rows: tasks };
    }

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

    // --- evaluation_results ---
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

    if (text.includes('INSERT INTO evaluation_results')) {
      const result: Result = {
        id: nextId(),
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

    if (text.includes('SELECT') && text.includes('evaluation_results')) {
      if (text.includes('WHERE task_id')) {
        return { rows: results.filter(r => r.task_id === params![0]) };
      }
      return { rows: results };
    }

    // --- tenants ---
    if (text.includes('INSERT INTO tenants')) {
      const tenant: Tenant = {
        id: nextId(),
        name: params![0],
        slug: params![1],
        plan: params![2] || 'free',
        config: params![3] || {},
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      tenants.push(tenant);
      return { rows: [tenant] };
    }

    if (text.includes('SELECT') && text.includes('tenants')) {
      if (text.includes('WHERE id')) {
        return { rows: tenants.filter(t => t.id === params![0]) };
      }
      if (text.includes('WHERE slug')) {
        return { rows: tenants.filter(t => t.slug === params![0]) };
      }
      return { rows: tenants };
    }

    // --- api_keys ---
    if (text.includes('INSERT INTO api_keys')) {
      const key: ApiKey = {
        id: nextId(),
        tenant_id: params![0],
        name: params![1],
        key_prefix: params![2],
        key_hash: params![3],
        scopes: params![4] || ['parse'],
        rate_limit: params![5] || 100,
        is_active: true,
        expires_at: params![6] || null,
        last_used_at: null,
        created_at: new Date().toISOString(),
      };
      apiKeys.push(key);
      return { rows: [key] };
    }

    if (text.includes('SELECT') && text.includes('api_keys')) {
      if (text.includes('WHERE key_hash')) {
        return { rows: apiKeys.filter(k => k.key_hash === params![0]) };
      }
      if (text.includes('WHERE tenant_id') && text.includes('is_active')) {
        return { rows: apiKeys.filter(k => k.tenant_id === params![0] && k.is_active) };
      }
      if (text.includes('WHERE id')) {
        return { rows: apiKeys.filter(k => k.id === params![0]) };
      }
      return { rows: apiKeys };
    }

    if (text.includes('UPDATE api_keys')) {
      if (text.includes('last_used_at')) {
        const key = apiKeys.find(k => k.id === params![0]);
        if (key) key.last_used_at = new Date().toISOString();
        return { rows: key ? [key] : [] };
      }
      if (text.includes('is_active')) {
        const key = apiKeys.find(k => k.id === params![1]);
        if (key) key.is_active = params![0];
        return { rows: key ? [key] : [] };
      }
      return { rows: [] };
    }

    // --- parse_jobs ---
    if (text.includes('INSERT INTO parse_jobs')) {
      // Extended insert (from parseHistory route — 11 params including status, result, error, etc.)
      if (text.includes('status')) {
        const job: ParseJob = {
          id: nextId(),
          tenant_id: params![0],
          api_key_id: params![1],
          file_name: params![2],
          file_hash: params![3] || null,
          file_size: params![4] || 0,
          mime_type: params![5] || 'application/octet-stream',
          status: params![6] || 'pending',
          result: params![7] || null,
          error: params![8] || null,
          processing_time: params![9] || null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: params![10] || null,
          webhook_url: null,
          webhook_status: null,
        };
        parseJobs.push(job);
        return { rows: [job] };
      }
      // Insert with webhook_url (from async parse route — 6 params)
      if (text.includes('webhook_url')) {
        const job: ParseJob = {
          id: nextId(),
          tenant_id: params![0],
          api_key_id: params![1],
          status: 'pending',
          file_name: params![2],
          file_hash: null,
          file_size: params![3],
          mime_type: params![4],
          result: null,
          error: null,
          processing_time: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          webhook_url: params![5] || null,
          webhook_status: null,
        };
        parseJobs.push(job);
        return { rows: [job] };
      }
      // Simple insert (from parse route — 5 params: tenant_id, api_key_id, file_name, file_size, mime_type)
      const job: ParseJob = {
        id: nextId(),
        tenant_id: params![0],
        api_key_id: params![1],
        status: 'pending',
        file_name: params![2],
        file_hash: null,
        file_size: params![3],
        mime_type: params![4],
        result: null,
        error: null,
        processing_time: null,
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        webhook_url: null,
        webhook_status: null,
      };
      parseJobs.push(job);
      return { rows: [job] };
    }

    if (text.includes('SELECT') && text.includes('parse_jobs')) {
      if (text.includes('COUNT')) {
        let filtered = parseJobs;
        if (text.includes('tenant_id IS NULL')) {
          filtered = filtered.filter(j => j.tenant_id === null);
          if (params && params.length > 0) {
            let pIdx = 0;
            if (text.includes('status =')) {
              filtered = filtered.filter(j => j.status === params![pIdx]);
              pIdx++;
            }
            if (text.includes('ILIKE')) {
              const search = (params![pIdx] as string).replace(/%/g, '').toLowerCase();
              filtered = filtered.filter(j => j.file_name.toLowerCase().includes(search));
            }
          }
        }
        return { rows: [{ count: filtered.length.toString() }] };
      }
      if (text.includes('WHERE id') && text.includes('tenant_id IS NULL')) {
        return { rows: parseJobs.filter(j => j.id === params![0] && j.tenant_id === null) };
      }
      if (text.includes('WHERE id')) {
        return { rows: parseJobs.filter(j => j.id === params![0]) };
      }
      if (text.includes('tenant_id IS NULL') && text.includes('ORDER BY')) {
        let filtered = parseJobs.filter(j => j.tenant_id === null);
        let pIdx = 0;
        if (text.includes('status =')) {
          filtered = filtered.filter(j => j.status === params![pIdx]);
          pIdx++;
        }
        if (text.includes('ILIKE')) {
          const search = (params![pIdx] as string).replace(/%/g, '').toLowerCase();
          filtered = filtered.filter(j => j.file_name.toLowerCase().includes(search));
          pIdx++;
        }
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const limit = params![pIdx] as number;
        const offset = params![pIdx + 1] as number;
        return { rows: filtered.slice(offset, offset + limit) };
      }
      if (text.includes('WHERE tenant_id')) {
        return { rows: parseJobs.filter(j => j.tenant_id === params![0]) };
      }
      return { rows: parseJobs };
    }

    if (text.includes('DELETE') && text.includes('parse_jobs')) {
      if (text.includes('WHERE id') && text.includes('tenant_id IS NULL')) {
        const idx = parseJobs.findIndex(j => j.id === params![0] && j.tenant_id === null);
        if (idx >= 0) parseJobs.splice(idx, 1);
        return { rows: [] };
      }
      if (text.includes('WHERE tenant_id IS NULL')) {
        for (let i = parseJobs.length - 1; i >= 0; i--) {
          if (parseJobs[i].tenant_id === null) parseJobs.splice(i, 1);
        }
        return { rows: [] };
      }
      return { rows: [] };
    }

    if (text.includes('UPDATE parse_jobs')) {
      const id = params![params!.length - 1];
      const job = parseJobs.find(j => j.id === id);
      if (job) {
        if (text.includes('webhook_status')) {
          job.webhook_status = params![0];
        } else if (text.includes('status') && text.includes('result')) {
          job.status = params![0];
          job.result = params![1];
          job.file_hash = params![2];
          job.processing_time = params![3];
          job.completed_at = new Date().toISOString();
        } else if (text.includes('status') && text.includes('error')) {
          job.status = params![0];
          job.error = params![1];
          job.completed_at = new Date().toISOString();
        } else if (text.includes('started_at')) {
          job.status = 'processing';
          job.started_at = new Date().toISOString();
        }
        return { rows: [job] };
      }
      return { rows: [] };
    }

    // --- parse_cache ---
    if (text.includes('INSERT INTO parse_cache') || text.includes('ON CONFLICT')) {
      const existing = parseCache.find(c => c.hash === params![0]);
      if (existing) {
        existing.data = typeof params![1] === 'string' ? JSON.parse(params![1]) : params![1];
        existing.version = params![2];
        existing.updated_at = new Date().toISOString();
        return { rows: [existing] };
      }
      const entry: CacheEntry = {
        hash: params![0],
        data: typeof params![1] === 'string' ? JSON.parse(params![1]) : params![1],
        version: params![2],
        tenant_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      parseCache.push(entry);
      return { rows: [entry] };
    }

    if (text.includes('SELECT') && text.includes('parse_cache')) {
      if (text.includes('WHERE hash')) {
        return { rows: parseCache.filter(c => c.hash === params![0]) };
      }
      if (text.includes('COUNT')) {
        return { rows: [{ count: parseCache.length.toString() }] };
      }
      return { rows: parseCache };
    }

    if (text.includes('DELETE') && text.includes('parse_cache')) {
      if (text.includes('WHERE hash IN')) {
        // Bulk delete oldest
        const limit = params![0];
        const sorted = [...parseCache].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        const toDelete = sorted.slice(0, limit).map(e => e.hash);
        for (const hash of toDelete) {
          const idx = parseCache.findIndex(c => c.hash === hash);
          if (idx >= 0) parseCache.splice(idx, 1);
        }
        return { rows: [] };
      }
      if (text.includes('WHERE hash')) {
        const idx = parseCache.findIndex(c => c.hash === params![0]);
        if (idx >= 0) parseCache.splice(idx, 1);
        return { rows: [] };
      }
      return { rows: [] };
    }

    // --- prompt_experiments ---
    if (text.includes('INSERT INTO prompt_experiments')) {
      const experiment: PromptExperiment = {
        id: nextId(),
        task_ids: typeof params![0] === 'string' ? JSON.parse(params![0]) : params![0],
        weak_fields: typeof params![1] === 'string' ? JSON.parse(params![1]) : params![1],
        suggestion: params![2] || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      promptExperiments.push(experiment);
      return { rows: [experiment] };
    }

    if (text.includes('SELECT') && text.includes('prompt_experiments')) {
      if (text.includes('WHERE id')) {
        return { rows: promptExperiments.filter(e => e.id === params![0]) };
      }
      // Default: list all, ordered by created_at DESC
      const sorted = [...promptExperiments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return { rows: sorted };
    }

    if (text.includes('UPDATE') && text.includes('prompt_experiments')) {
      const id = params![params!.length - 1];
      const experiment = promptExperiments.find(e => e.id === id);
      if (experiment) {
        if (params![0] !== null) experiment.task_ids = typeof params![0] === 'string' ? JSON.parse(params![0]) : params![0];
        if (params![1] !== null) experiment.weak_fields = typeof params![1] === 'string' ? JSON.parse(params![1]) : params![1];
        if (params![2] !== null) experiment.suggestion = params![2];
        if (params![3] !== null) experiment.status = params![3];
        return { rows: [experiment] };
      }
      return { rows: [] };
    }

    if (text.includes('DELETE') && text.includes('prompt_experiments')) {
      const idx = promptExperiments.findIndex(e => e.id === params![0]);
      if (idx >= 0) {
        const deleted = promptExperiments.splice(idx, 1);
        return { rows: deleted };
      }
      return { rows: [] };
    }

    // --- flywheel_promotions ---
    if (text.includes('INSERT INTO flywheel_promotions')) {
      const promotion: FlywheelPromotion = {
        id: nextId(),
        candidate_id: params![0],
        evaluation_task_id: params![1],
        promoted_at: new Date().toISOString(),
      };
      flywheelPromotions.push(promotion);
      return { rows: [promotion] };
    }

    if (text.includes('SELECT') && text.includes('flywheel_promotions')) {
      if (text.includes('WHERE candidate_id')) {
        return { rows: flywheelPromotions.filter(p => p.candidate_id === params![0]) };
      }
      return { rows: flywheelPromotions };
    }

    // --- schema_migrations (no-op for memory) ---
    if (text.includes('schema_migrations') || text.includes('CREATE TABLE') || text.includes('CREATE INDEX')) {
      return { rows: [] };
    }

    return { rows: [] };
  },
};
