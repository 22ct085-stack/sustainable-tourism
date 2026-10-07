import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import api from './routes/api';
import { errorHandler, notFound } from './middleware/errors';

const app = express();
app.use(cors({ origin: env.clientUrl.split(',').map((origin) => origin.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);
export default app;
