import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

/**
 * Initialize database connection pool
 * Uses connection string from DATABASE_URL env var
 */
export function initDB(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  pool = new Pool({
    connectionString,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased to 10s for Railway connections
    ssl: connectionString.includes('railway') ? { rejectUnauthorized: false } : undefined,
  });

  // Log connection errors
  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
  });

  console.log('✓ Database connection pool initialized');
  return pool;
}

/**
 * Get the database pool instance
 */
export function getDB(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return pool;
}

/**
 * Execute a query with parameters
 * Handles errors and logs for debugging
 */
export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const db = getDB();
  const start = Date.now();
  
  try {
    const result = await db.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (>1s)
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', {
      error: error instanceof Error ? error.message : error,
      query: text.substring(0, 200),
      params: params?.length ? `[${params.length} params]` : 'none',
    });
    throw error;
  }
}

/**
 * Close all database connections
 * Call this on graceful shutdown
 */
export async function closeDB(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✓ Database connection pool closed');
  }
}

/**
 * Health check - verify database connectivity
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as now');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
