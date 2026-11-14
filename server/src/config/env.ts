// Reads settings from environment variables (server/.env). Secrets stay on the server only.

export type Env = {
  mongodbUri: string;
  mongodbDbName: string;
  port: number;
  appOrigin: string;
  isProduction: boolean;
  sessionDays: number;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.includes('<')) {
    throw new Error(`Missing environment variable ${name}. Copy server/.env.example to server/.env and fill it in.`);
  }
  return value;
}

export function loadEnv(): Env {
  return {
    mongodbUri: required('MONGODB_URI'),
    mongodbDbName: process.env.MONGODB_DB_NAME ?? 'riverbound',
    port: Number(process.env.PORT ?? 4000),
    appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:5173',
    isProduction: process.env.NODE_ENV === 'production',
    sessionDays: Number(process.env.SESSION_DAYS ?? 7),
  };
}
