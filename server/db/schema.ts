import { Generated, ColumnType } from 'kysely';

// ---------------------------------------------------------------------------
// Table types — single source of truth for the database schema
// ---------------------------------------------------------------------------

export interface EvaluationTasksTable {
  id: Generated<string>;
  name: string;
  description: string | null;
  type: string;
  status: string;
  config: string;
  stats: Generated<string>;
  created_by: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface EvaluationResultsTable {
  id: Generated<string>;
  task_id: string;
  file_name: string;
  file_hash: string;
  parsed_resume: string;
  annotation: string | null;
  classification: string;
  process_trace: string;
  metrics: string;
  processing_time: number;
  from_cache: ColumnType<boolean, boolean | number, boolean | number>;
  created_at: Generated<string>;
}

export interface TenantsTable {
  id: Generated<string>;
  name: string;
  slug: string;
  plan: Generated<string>;
  config: Generated<string>;
  is_active: ColumnType<boolean, boolean | number | undefined, boolean | number>;
  quota_per_minute: Generated<number>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface ApiKeysTable {
  id: Generated<string>;
  tenant_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: Generated<string>;
  rate_limit: Generated<number>;
  is_active: ColumnType<boolean, boolean | number | undefined, boolean | number>;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: Generated<string>;
}

export interface ParseJobsTable {
  id: Generated<string>;
  tenant_id: string | null;
  api_key_id: string | null;
  status: Generated<string>;
  file_name: string;
  file_hash: string | null;
  file_size: number;
  mime_type: string;
  result: string | null;
  error: string | null;
  processing_time: number | null;
  created_at: Generated<string>;
  started_at: string | null;
  completed_at: string | null;
  webhook_url: string | null;
  webhook_status: string | null;
}

export interface ParseCacheTable {
  hash: string;
  data: string;
  version: Generated<string>;
  tenant_id: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface PromptExperimentsTable {
  id: Generated<string>;
  task_ids: Generated<string>;
  weak_fields: Generated<string>;
  suggestion: Generated<string>;
  status: Generated<string>;
  created_at: Generated<string>;
}

export interface FlywheelPromotionsTable {
  id: Generated<string>;
  candidate_id: string;
  evaluation_task_id: string;
  promoted_at: Generated<string>;
}

export interface SchemaMigrationsTable {
  version: string;
  executed_at: Generated<string>;
}

// ---------------------------------------------------------------------------
// Database interface — all tables
// ---------------------------------------------------------------------------

export interface DB {
  evaluation_tasks: EvaluationTasksTable;
  evaluation_results: EvaluationResultsTable;
  tenants: TenantsTable;
  api_keys: ApiKeysTable;
  parse_jobs: ParseJobsTable;
  parse_cache: ParseCacheTable;
  prompt_experiments: PromptExperimentsTable;
  flywheel_promotions: FlywheelPromotionsTable;
  schema_migrations: SchemaMigrationsTable;
}
