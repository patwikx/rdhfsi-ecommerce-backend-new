const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME'];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing environment variable: ${varName}`);
  }
});

export const config = {
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  server: process.env.DB_HOST!,
  database: process.env.DB_NAME!,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 60000,  // 1 minute in milliseconds
  requestTimeout: 60000,     // 1 minute in milliseconds
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};