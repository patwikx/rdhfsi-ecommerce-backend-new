// db.ts
import sql from 'mssql';
import { config } from './db-config';

let pool: sql.ConnectionPool | null = null;

async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('Successfully connected to the database');
    } catch (error) {
      console.error('Failed to connect to the database:', error);
      throw error;
    }
  }
  return pool;
}

export async function executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const connection = await getConnection();
    const request = connection.request();
    
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('SQL error', error);
    throw error;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.close();
      console.log('Database connection pool closed');
    } catch (error) {
      console.error('Error closing database connection pool:', error);
    }
    pool = null;
  }
}