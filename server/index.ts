import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import { runMigrations } from './db';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { swaggerSpec } from './lib/swagger';
import evaluationsRouter from './routes/evaluations';
import annotationsRouter from './routes/annotations';
import reportsRouter from './routes/reports';
import keysRouter from './routes/keys';
import parseRouter from './routes/parse';
import usageRouter from './routes/usage';
import parseHistoryRouter from './routes/parseHistory';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Multer 配置 — 内存存储，10MB 限制
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// 全局中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(requestLoggerMiddleware);

// 静态文件
app.use('/test-resumes', express.static(path.join(__dirname, '../test-resumes')));

// Swagger 文档（无需认证）
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// 内部路由（无需认证 — 前端管理页面使用）
app.use('/api/evaluations', evaluationsRouter);
app.use('/api/annotations', annotationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/keys', keysRouter);
app.use('/api/usage', usageRouter);
app.use('/api/parse-history', parseHistoryRouter);

// 外部 API 路由（需认证 + 限流 — 第三方调用）
app.use('/api/v1', authMiddleware);
app.use('/api/v1', rateLimitMiddleware);
app.use('/api/v1/keys', keysRouter);
app.use('/api/v1/usage', usageRouter);
app.use('/api/v1/parse', upload.single('file'), parseRouter);
app.use('/api/v1/parse/batch', upload.array('files', 20));

// 健康检查
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动
async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
