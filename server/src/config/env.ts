// Reads settings from environment variables (server/.env). Secrets stay on the server only.

export type Env = {
  mongodbUri: string;
  mongodbDbName: string;
  port: number;
  appOrigin: string;
  isProduction: boolean;
  sessionDays: number;
  /** Google sign-in. null when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set (the button is then disabled). */
  google: { clientId: string; clientSecret: string; redirectUri: string } | null;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.includes('<')) {
    throw new Error(`Missing environment variable ${name}. Copy server/.env.example to server/.env and fill it in.`);
  }
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && !value.includes('<') ? value : null;
}

export function loadEnv(): Env {
  const appOrigin = process.env.APP_ORIGIN ?? 'http://localhost:5173';
  const googleClientId = optional('GOOGLE_CLIENT_ID');
  const googleClientSecret = optional('GOOGLE_CLIENT_SECRET');
  return {
    mongodbUri: required('MONGODB_URI'),
    mongodbDbName: process.env.MONGODB_DB_NAME ?? 'riverbound',
    port: Number(process.env.PORT ?? 4000),
    appOrigin,
    isProduction: process.env.NODE_ENV === 'production',
    sessionDays: Number(process.env.SESSION_DAYS ?? 7),
    google:
      googleClientId && googleClientSecret
        ? {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            // Google sends the player back here. It goes through the React app's address, so the
            // cookies belong to the app (Vite forwards /api to this server in development).
            redirectUri: optional('GOOGLE_REDIRECT_URI') ?? `${appOrigin}/api/auth/google/callback`,
          }
        : null,
  };
}
