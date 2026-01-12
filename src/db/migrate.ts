import { readFileSync } from 'fs';
import { join } from 'path';
import { getDB } from './index';

/**
 * Run database migrations
 * In production, use a proper migration tool like Flyway or node-pg-migrate
 * For this assessment, we'll keep it simple
 */
async function migrate() {
  try {
    console.log('Running database migrations...');
    
    const schemaPath = join(__dirname, '..', '..', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    const db = getDB();
    await db.query(schema);
    
    console.log('✓ Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  // Initialize DB and run migrations
  const { initDB } = require('./index');
  initDB();
  migrate();
}

export default migrate;
