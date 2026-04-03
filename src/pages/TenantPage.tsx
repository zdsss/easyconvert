import { useEffect, useState } from 'react';
import Icon from '@components/ui/Icon';
import MetricCard from '@components/ui/MetricCard';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  quotaPerMinute: number;
}

export default function TenantPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuota, setEditQuota] = useState<number>(100);

  useEffect(() => { loadTenants(); }, []);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenants');
      const data = await res.json();
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuota = async (id: string) => {
    await fetch(`/api/tenants/${id}/quota`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotaPerMinute: editQuota }),
    });
    setEditingId(null);
    loadTenants();
  };

  const avgQuota = tenants.length
    ? Math.round(tenants.reduce((s, t) => s + t.quotaPerMinute, 0) / tenants.length)
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">租户管理</h1>
          <p className="text-sm text-text-secondary mt-1">管理租户配额和用量</p>
        </div>
        <button onClick={loadTenants} className="btn-ghost p-2" title="刷新">
          <Icon name="refresh-cw" size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <MetricCard title="租户总数" value={tenants.length} icon="users" />
        <MetricCard title="平均配额" value={avgQuota} icon="zap" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-secondary">加载中...</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <Icon name="users" size={40} className="mx-auto mb-3 text-text-tertiary" />
          <p>暂无租户数据</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">租户名称</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Slug</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">配额 (req/min)</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">创建时间</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">操作</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} className="border-t border-border-light">
                  <td className="px-5 py-3 font-medium text-text-primary">{t.name}</td>
                  <td className="px-5 py-3 text-text-secondary font-mono text-xs">{t.slug}</td>
                  <td className="px-5 py-3">
                    {editingId === t.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editQuota}
                          onChange={e => setEditQuota(Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-border rounded text-sm"
                          min={1}
                        />
                        <button onClick={() => handleSaveQuota(t.id)} className="btn-primary text-xs px-2 py-1">保存</button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-2 py-1">取消</button>
                      </div>
                    ) : (
                      <span className="font-mono">{t.quotaPerMinute}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-text-secondary text-xs">
                    {new Date(t.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => { setEditingId(t.id); setEditQuota(t.quotaPerMinute); }}
                      className="btn-ghost p-1.5"
                      title="编辑配额"
                    >
                      <Icon name="edit-2" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
