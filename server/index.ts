import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import evaluationsRouter from './routes/evaluations';
import annotationsRouter from './routes/annotations';
import reportsRouter from './routes/reports';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve test-resumes as static files (for ground-truth.json access from frontend)
app.use('/test-resumes', express.static(path.join(__dirname, '../test-resumes')));

app.use('/api/evaluations', evaluationsRouter);
app.use('/api/annotations', annotationsRouter);
app.use('/api/reports', reportsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
