import { Router } from 'express';
import db from '../db';

const router = Router();

/**
 * 根据 tenantId 参数查找真实 UUID（支持 slug）
 */
async function resolveTenantId(tenantId: string): Promise<string | null> {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
    return tenantId;
  }
  try {
    const result = await db.query('SELECT id FROM tenants WHERE slug = $1', [tenantId]);
    return result.rows[0]?.id || null;
  } catch {
    return null;
  }
}

/**
 * @openapi
 * /usage:
 *   get:
 *     summary: 用量统计（从 parse_jobs 聚合）
 *     tags: [Usage]
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: 用量统计数据
 *       500:
 *         description: 服务器错误
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.query.tenantId || 'default';
    const days = parseInt(req.query.days as string) || 7;

    try {
      // 总请求数 + 成功率 + 平均延迟
      const summaryResult = await db.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'completed') as success_count,
           COUNT(*) FILTER (WHERE status = 'failed') as fail_count,
           AVG(processing_time) FILTER (WHERE processing_time IS NOT NULL) as avg_latency,
           SUM(COALESCE((result->>'tokenCount')::int, 0)) as total_tokens
         FROM parse_jobs
         WHERE created_at > NOW() - INTERVAL '1 day' * $1`,
        [days]
      );

      const total = parseInt(summaryResult.rows[0]?.total) || 0;
      const successCount = parseInt(summaryResult.rows[0]?.success_count) || 0;
      const avgLatency = parseFloat(summaryResult.rows[0]?.avg_latency) || 0;
      const totalTokens = parseInt(summaryResult.rows[0]?.total_tokens) || 0;
      const successRate = total > 0 ? (successCount / total) * 100 : 0;

      // 按天分组请求数
      const dailyResult = await db.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM parse_jobs
         WHERE created_at > NOW() - INTERVAL '1 day' * $1
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [days]
      );

      // 填充缺失的日期
      const requestsByDay: { date: string; count: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const found = dailyResult.rows.find((r: any) => r.date?.toISOString?.().split('T')[0] === dateStr || r.date === dateStr);
        requestsByDay.push({ date: dateStr, count: found ? parseInt(found.count) : 0 });
      }

      // 延迟分布（基于 processing_time 字段，单位 ms）
      const latencyResult = await db.query(
        `SELECT
           COUNT(*) FILTER (WHERE processing_time < 100) as lt100,
           COUNT(*) FILTER (WHERE processing_time >= 100 AND processing_time < 500) as lt500,
           COUNT(*) FILTER (WHERE processing_time >= 500 AND processing_time < 1000) as lt1000,
           COUNT(*) FILTER (WHERE processing_time >= 1000 AND processing_time < 3000) as lt3000,
           COUNT(*) FILTER (WHERE processing_time >= 3000) as gt3000
         FROM parse_jobs
         WHERE processing_time IS NOT NULL AND created_at > NOW() - INTERVAL '1 day' * $1`,
        [days]
      );

      const lr = latencyResult.rows[0] || {};
      const latencyDistribution = [
        { bucket: '<100ms', count: parseInt(lr.lt100) || 0 },
        { bucket: '100-500ms', count: parseInt(lr.lt500) || 0 },
        { bucket: '500ms-1s', count: parseInt(lr.lt1000) || 0 },
        { bucket: '1-3s', count: parseInt(lr.lt3000) || 0 },
        { bucket: '>3s', count: parseInt(lr.gt3000) || 0 },
      ];

      // 按端点分组（从 result->>'endpoint' 或按 mime_type 近似）
      const endpointResult = await db.query(
        `SELECT
           COALESCE(result->>'endpoint', '/api/v1/parse') as endpoint,
           COUNT(*) as count,
           AVG(processing_time) FILTER (WHERE processing_time IS NOT NULL) as avg_latency
         FROM parse_jobs
         WHERE created_at > NOW() - INTERVAL '1 day' * $1
         GROUP BY COALESCE(result->>'endpoint', '/api/v1/parse')
         ORDER BY count DESC`,
        [days]
      );

      const requestsByEndpoint = endpointResult.rows.map((r: any) => ({
        endpoint: r.endpoint,
        count: parseInt(r.count) || 0,
        avgLatency: Math.round(parseFloat(r.avg_latency) || 0),
      }));

      res.json({
        totalRequests: total,
        successRate: Math.round(successRate * 10) / 10,
        avgLatency: Math.round(avgLatency),
        totalTokens,
        requestsByEndpoint,
        requestsByDay,
        latencyDistribution,
      });
    } catch {
      // DB not available — return empty data
      res.json({
        totalRequests: 0,
        successRate: 0,
        avgLatency: 0,
        totalTokens: 0,
        requestsByEndpoint: [],
        requestsByDay: [],
        latencyDistribution: [],
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * @openapi
 * /usage/overview:
 *   get:
 *     summary: API 概览（活跃 Key 数、总请求数、限流使用率）
 *     tags: [Usage]
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 概览数据
 *       500:
 *         description: 服务器错误
 */
router.get('/overview', async (req, res) => {
  try {
    const rawTenantId = (req.query.tenantId as string) || 'default';

    try {
      const tenantId = await resolveTenantId(rawTenantId);

      // 活跃 Key 数
      let activeKeys = 0;
      if (tenantId) {
        const keysResult = await db.query(
          'SELECT COUNT(*) as count FROM api_keys WHERE tenant_id = $1 AND is_active = TRUE',
          [tenantId]
        );
        activeKeys = parseInt(keysResult.rows[0]?.count) || 0;
      }

      // 总请求数（7天）
      const reqResult = await db.query(
        `SELECT COUNT(*) as total FROM parse_jobs WHERE created_at > NOW() - INTERVAL '7 days'`
      );
      const totalRequests = parseInt(reqResult.rows[0]?.total) || 0;

      // 7天每日请求趋势
      const trendResult = await db.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM parse_jobs
         WHERE created_at > NOW() - INTERVAL '7 days'
         GROUP BY DATE(created_at)
         ORDER BY date`
      );

      const requestTrend: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const found = trendResult.rows.find((r: any) => r.date?.toISOString?.().split('T')[0] === dateStr || r.date === dateStr);
        requestTrend.push({ date: dateStr, count: found ? parseInt(found.count) : 0 });
      }

      // 限流使用率：最近1分钟请求数 / 最大限流值
      const recentResult = await db.query(
        `SELECT COUNT(*) as count FROM parse_jobs WHERE created_at > NOW() - INTERVAL '1 minute'`
      );
      const recentCount = parseInt(recentResult.rows[0]?.count) || 0;
      // 默认限流 100/min
      const rateLimitUsage = Math.min((recentCount / 100) * 100, 100);

      res.json({
        tenantId: rawTenantId,
        activeKeys,
        totalRequests,
        rateLimitUsage: Math.round(rateLimitUsage * 10) / 10,
        requestTrend,
      });
    } catch {
      res.json({
        tenantId: rawTenantId,
        activeKeys: 0,
        totalRequests: 0,
        rateLimitUsage: 0,
        requestTrend: [],
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
