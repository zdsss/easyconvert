import { useEffect, useState } from 'react';
import { useApiStore } from '@lib/store/apiStore';
import ConfirmDialog from '@components/ui/ConfirmDialog';
import Icon from '@components/ui/Icon';
import type { ApiKey } from '@lib/api/apiManagementApi';

export default function ApiKeys() {
  const { keys, loadKeys, createKey, deleteKey, error } = useApiStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', scopes: ['parse'] as string[], rateLimit: 100, expiresAt: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const key = await createKey({
        name: createForm.name,
        scopes: createForm.scopes,
        rateLimit: createForm.rateLimit,
        expiresAt: createForm.expiresAt || undefined,
      });
      setShowCreate(false);
      setShowKeyModal(key.key || null);
      setCreateForm({ name: '', scopes: ['parse'], rateLimit: 100, expiresAt: '' });
    } catch {
      // error handled by store
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteKey(deleteTarget.id);
    setDeleteTarget(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">API Keys</h1>
          <p className="text-sm text-text-secondary mt-1">管理 API 访问密钥</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Icon name="plus" size={16} />
          创建 Key
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-status-warning-bg border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Icon name="alert-triangle" size={16} />
          {error}
        </div>
      )}

      {/* Key list */}
      {keys.length === 0 ? (
        <div className="text-center py-16">
          <Icon name="key" size={40} className="mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary">暂无 API Key</p>
          <p className="text-sm text-text-tertiary mt-1">创建一个 Key 来开始使用 API</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(key => (
            <div key={key.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-text-primary">{key.name}</h3>
                    {key.is_active ? <span className="badge-success">活跃</span> : <span className="badge-neutral">已禁用</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                    <span className="font-mono text-xs bg-surface-tertiary px-2 py-0.5 rounded">{key.key_prefix}...</span>
                    <span className="flex items-center gap-1">
                      <Icon name="shield" size={13} />
                      {key.scopes?.join(', ') || 'parse'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="zap" size={13} />
                      {key.rate_limit}/min
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-text-tertiary">
                    <span>创建: {new Date(key.created_at).toLocaleDateString()}</span>
                    {key.expires_at && <span>过期: {new Date(key.expires_at).toLocaleDateString()}</span>}
                    {key.last_used_at && <span>最后使用: {new Date(key.last_used_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(key)}
                  className="btn-ghost p-1.5 text-text-tertiary hover:text-status-error"
                  title="删除"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-surface rounded-xl border border-border shadow-lg w-full max-w-md animate-scale-in p-6">
            <h3 className="section-title mb-4">创建 API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">名称 *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="input"
                  placeholder="例如：生产环境"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">权限</label>
                <div className="flex gap-2">
                  {['parse', 'batch', 'admin'].map(scope => (
                    <label key={scope} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={createForm.scopes.includes(scope)}
                        onChange={e => {
                          const scopes = e.target.checked
                            ? [...createForm.scopes, scope]
                            : createForm.scopes.filter(s => s !== scope);
                          setCreateForm({ ...createForm, scopes });
                        }}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      {scope}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">限流 (请求/分钟)</label>
                <input
                  type="number"
                  value={createForm.rateLimit}
                  onChange={e => setCreateForm({ ...createForm, rateLimit: parseInt(e.target.value) || 100 })}
                  className="input"
                  min={1}
                  max={1000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">过期时间（可选）</label>
                <input
                  type="date"
                  value={createForm.expiresAt}
                  onChange={e => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">取消</button>
              <button onClick={handleCreate} disabled={!createForm.name.trim() || creating} className="btn-primary flex items-center gap-2">
                {creating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key display modal (one-time) */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-surface rounded-xl border border-border shadow-lg w-full max-w-md animate-scale-in p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="alert-triangle" size={20} className="text-status-warning" />
              <h3 className="section-title">保存你的 API Key</h3>
            </div>
            <p className="text-sm text-text-secondary mb-3">
              这是唯一一次显示完整 Key，请妥善保存。
            </p>
            <div className="flex items-center gap-2 p-3 bg-surface-secondary rounded-lg font-mono text-sm break-all">
              <span className="flex-1 text-text-primary">{showKeyModal}</span>
              <button onClick={() => copyToClipboard(showKeyModal)} className="btn-ghost p-1.5 shrink-0" title="复制">
                <Icon name="copy" size={16} />
              </button>
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={() => setShowKeyModal(null)} className="btn-primary">我已保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title={`删除 Key "${deleteTarget?.name}"？`}
        description="删除后使用此 Key 的所有请求将被拒绝，此操作不可撤销。"
        variant="danger"
        requireInput={deleteTarget?.name}
      />
    </div>
  );
}
