const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'] as const;

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return config;
}
