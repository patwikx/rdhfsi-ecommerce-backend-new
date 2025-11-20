import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_HOST || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false, // Set to true if using Azure
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool;

export async function getConnection() {
  try {
    if (!pool) {
      pool = new sql.ConnectionPool(config);
      await pool.connect();
    }
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export async function closeConnection() {
  try {
    if (pool) {
      await pool.close();
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}