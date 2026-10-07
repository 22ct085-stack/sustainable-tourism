import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';

async function start() {
  app.listen(env.port, () => console.log(`S-CADE API listening on http://localhost:${env.port}`));
  if (env.mongoUri) {
    void mongoose.connect(env.mongoUri)
      .then(() => console.log('MongoDB connected'))
      .catch((error) => console.error('MongoDB connection failed; real-time recommendations remain available.', error instanceof Error ? error.message : 'Unknown error'));
  }
}
void start();
